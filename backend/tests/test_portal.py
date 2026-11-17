import pytest
from httpx import AsyncClient, ASGITransport
import os
import sqlite3

# Set test environment
os.environ["PORTAL_DB_PATH"] = "test_portal.db"
os.environ["PORTAL_SECRET_KEY"] = "test-secret"
os.environ["DESIGNATED_APPROVER"] = "approver_user"

from main import app
from database import init_db, get_db

TEST_DB = os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_portal.db")


@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()
    yield
    if os.path.exists(TEST_DB):
        try:
            os.remove(TEST_DB)
        except Exception:
            pass


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


REQ_HEADERS = {"X-Portal-User": "engineer_user"}
APPR_HEADERS = {"X-Portal-User": "approver_user"}


# 1. Health & Catalogue Tests
@pytest.mark.anyio
async def test_health_check(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.anyio
async def test_automation_catalogue(client):
    r = await client.get("/api/v1/automations")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 10  # 10 predefined automations
    # Verify fixed actions
    for item in items:
        assert item["action"] in ("START", "STOP")
        assert item["os"] in ("Linux", "Windows")
        assert item["category"] in ("SAP HANA", "SAP", "Oracle")


# 2. Input Validation Tests
@pytest.mark.anyio
async def test_submit_missing_sid(client):
    r = await client.post("/api/v1/requests", json={
        "automation_id": "hana-linux-start",
        "sid": "",
        "parameters": {"instance_number": "00"}
    }, headers=REQ_HEADERS)
    assert r.status_code == 422


@pytest.mark.anyio
async def test_submit_missing_required_parameter(client):
    r = await client.post("/api/v1/requests", json={
        "automation_id": "hana-linux-start",
        "sid": "HDB",
        "parameters": {}  # Missing instance_number
    }, headers=REQ_HEADERS)
    assert r.status_code == 422
    assert "Instance Number" in r.json()["detail"]


@pytest.mark.anyio
async def test_submit_valid_request(client):
    r = await client.post("/api/v1/requests", json={
        "automation_id": "hana-linux-start",
        "sid": "HDB",
        "parameters": {"instance_number": "00", "target_host": "hana01.corp"}
    }, headers=REQ_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "PENDING_APPROVAL"
    assert data["sid"] == "HDB"
    assert data["action"] == "START"  # Predefined immutable action preserved
    assert data["requested_by"] == "engineer_user"


# 3. Approval Workflow & Authorization Tests
@pytest.mark.anyio
async def test_unauthorized_approval_denied(client):
    # Submit request first
    sub = await client.post("/api/v1/requests", json={
        "automation_id": "oracle-linux-start",
        "sid": "ORCL",
        "parameters": {}
    }, headers=REQ_HEADERS)
    req_id = sub.json()["id"]

    # Requester tries to approve own request -> 403 Forbidden
    appr = await client.post(f"/api/v1/requests/{req_id}/approve", json={"comment": "Self-approved"}, headers=REQ_HEADERS)
    assert appr.status_code == 403
    assert "Only designated approvers" in appr.json()["detail"]


@pytest.mark.anyio
async def test_approver_can_reject_request(client):
    sub = await client.post("/api/v1/requests", json={
        "automation_id": "oracle-linux-stop",
        "sid": "ORCL",
        "parameters": {}
    }, headers=REQ_HEADERS)
    req_id = sub.json()["id"]

    rej = await client.post(f"/api/v1/requests/{req_id}/reject", json={"comment": "Maintenance window expired"}, headers=APPR_HEADERS)
    assert rej.status_code == 200
    assert rej.json()["status"] == "REJECTED"
    assert rej.json()["reviewed_by"] == "approver_user"

    # Verify no execution was triggered for rejected request
    execs = await client.get("/api/v1/executions")
    assert all(e["request_id"] != req_id for e in execs.json())


@pytest.mark.anyio
async def test_approver_can_approve_and_trigger_workflow(client):
    sub = await client.post("/api/v1/requests", json={
        "automation_id": "sap-linux-start",
        "sid": "S4H",
        "parameters": {"instance_number": "01"}
    }, headers=REQ_HEADERS)
    req_id = sub.json()["id"]

    # Approver approves
    appr = await client.post(f"/api/v1/requests/{req_id}/approve", json={"comment": "Approved for go-live"}, headers=APPR_HEADERS)
    assert appr.status_code == 200
    res = appr.json()
    assert res["status"] == "RUNNING"
    assert res["execution_id"] is not None

    # Check execution history
    execs = await client.get("/api/v1/executions")
    assert execs.status_code == 200
    matching = [e for e in execs.json() if e["request_id"] == req_id]
    assert len(matching) == 1
    assert matching[0]["workflow_file"] == "sap_start_linux.yml"
    assert matching[0]["github_workflow"] == "sap_start_linux.yml"
    assert matching[0]["sid"] == "S4H"
    assert matching[0]["triggered_by"] == "approver_user"
    assert matching[0]["triggered_at"] is not None


@pytest.mark.anyio
async def test_duplicate_approval_prevented(client):
    sub = await client.post("/api/v1/requests", json={
        "automation_id": "sap-windows-start",
        "sid": "ERP",
        "parameters": {"instance_number": "00"}
    }, headers=REQ_HEADERS)
    req_id = sub.json()["id"]

    # First approval
    a1 = await client.post(f"/api/v1/requests/{req_id}/approve", headers=APPR_HEADERS)
    assert a1.status_code == 200

    # Second approval attempt -> 409 Conflict
    a2 = await client.post(f"/api/v1/requests/{req_id}/approve", headers=APPR_HEADERS)
    assert a2.status_code == 409


# 4. Status Sync & Dashboard Tests
@pytest.mark.anyio
async def test_execution_status_sync(client):
    sub = await client.post("/api/v1/requests", json={
        "automation_id": "hana-linux-stop",
        "sid": "HDB",
        "parameters": {"instance_number": "00"}
    }, headers=REQ_HEADERS)
    req_id = sub.json()["id"]
    await client.post(f"/api/v1/requests/{req_id}/approve", headers=APPR_HEADERS)

    execs = await client.get(f"/api/v1/executions")
    exec_id = [e["id"] for e in execs.json() if e["request_id"] == req_id][0]

    sync_resp = await client.post(f"/api/v1/executions/{exec_id}/sync", headers=APPR_HEADERS)
    assert sync_resp.status_code == 200
    assert sync_resp.json()["status"] in ("RUNNING", "COMPLETED")


@pytest.mark.anyio
async def test_dashboard_summary(client):
    r = await client.get("/api/v1/dashboard/summary", headers=REQ_HEADERS)
    assert r.status_code == 200
    data = r.json()
    assert "total_requests" in data
    assert "pending_approvals" in data
    assert "running_executions" in data
    assert "successful_executions" in data
    assert "failed_executions" in data
