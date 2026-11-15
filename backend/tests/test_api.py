"""
Pytest suite for ITSM Automation Platform API.
Uses synchronous psycopg2 for isolated fixture test data setup to ensure 100% reliable test isolation.
"""
import uuid
import json
import psycopg2
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.auth import hash_token


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
def sync_db():
    conn = psycopg2.connect("postgresql://mansibagora@localhost:5432/itsm_platform")
    conn.autocommit = True
    cur = conn.cursor()
    yield cur
    cur.close()
    conn.close()


@pytest.fixture
def test_data(sync_db):
    u1_id = str(uuid.uuid4())
    u2_id = str(uuid.uuid4())
    t_id = str(uuid.uuid4())
    u1_name = f"admin_{uuid.uuid4().hex[:6]}"
    u2_name = f"other_{uuid.uuid4().hex[:6]}"
    t_no = f"TEST-{uuid.uuid4().hex[:6]}"
    corr_id = f"corr-test-{uuid.uuid4().hex[:8]}"

    sync_db.execute(
        "INSERT INTO users (id, username, email, role, hashed_token, active, created_at) VALUES (%s, %s, %s, %s, %s, %s, NOW())",
        (u1_id, u1_name, f"{u1_name}@itsm.local", "admin", hash_token("test123"), True),
    )
    sync_db.execute(
        "INSERT INTO users (id, username, email, role, hashed_token, active, created_at) VALUES (%s, %s, %s, %s, %s, %s, NOW())",
        (u2_id, u2_name, f"{u2_name}@itsm.local", "approver", hash_token("other123"), True),
    )

    payload_json = json.dumps({"category": "VPN Access", "SOURCE": "Test"})
    sync_db.execute(
        """INSERT INTO tickets (id, ticket_no, type, status, assignment_group, created_by, payload, source, correlation_id, created_at, updated_at) 
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())""",
        (t_id, t_no, "SR", "PENDING", "IT - Cloud Administration - CTO", "Test User", payload_json, "test", corr_id),
    )

    return {
        "u1_id": u1_id,
        "u1_name": u1_name,
        "u2_id": u2_id,
        "u2_name": u2_name,
        "t_id": t_id,
        "t_no": t_no,
        "headers": {"X-Dev-User": u1_name},
        "headers2": {"X-Dev-User": u2_name},
    }


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# --- Health & Readiness ---
@pytest.mark.anyio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.anyio
async def test_ready(client):
    resp = await client.get("/ready")
    assert resp.status_code == 200
    data = resp.json()
    assert data["checks"]["database"] == "ok"


# --- Auth ---
@pytest.mark.anyio
async def test_login(client, test_data):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": test_data["u1_name"], "token": "test123"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.anyio
async def test_login_invalid(client, test_data):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"username": test_data["u1_name"], "token": "wrong"},
    )
    assert resp.status_code == 401


@pytest.mark.anyio
async def test_me(client, test_data):
    resp = await client.get("/api/v1/auth/me", headers=test_data["headers"])
    assert resp.status_code == 200
    assert resp.json()["username"] == test_data["u1_name"]


# --- Tickets ---
@pytest.mark.anyio
async def test_list_tickets(client, test_data):
    resp = await client.get("/api/v1/tickets", headers=test_data["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert "tickets" in data
    assert data["total"] >= 1


@pytest.mark.anyio
async def test_list_tickets_filter_status(client, test_data):
    resp = await client.get(
        "/api/v1/tickets?status=PENDING", headers=test_data["headers"]
    )
    assert resp.status_code == 200
    for t in resp.json()["tickets"]:
        assert t["status"] == "PENDING"


@pytest.mark.anyio
async def test_get_ticket(client, test_data):
    resp = await client.get(
        f"/api/v1/tickets/{test_data['t_id']}", headers=test_data["headers"]
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == test_data["t_id"]


# --- Lock / Unlock ---
@pytest.mark.anyio
async def test_lock_ticket(client, test_data):
    resp = await client.post(
        f"/api/v1/tickets/{test_data['t_id']}/lock", headers=test_data["headers"]
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "LOCKED"


@pytest.mark.anyio
async def test_concurrent_lock_conflict(client, test_data):
    resp1 = await client.post(
        f"/api/v1/tickets/{test_data['t_id']}/lock", headers=test_data["headers"]
    )
    assert resp1.status_code == 200
    resp2 = await client.post(
        f"/api/v1/tickets/{test_data['t_id']}/lock", headers=test_data["headers2"]
    )
    assert resp2.status_code == 409


@pytest.mark.anyio
async def test_unlock_ticket(client, test_data):
    await client.post(
        f"/api/v1/tickets/{test_data['t_id']}/lock", headers=test_data["headers"]
    )
    resp = await client.post(
        f"/api/v1/tickets/{test_data['t_id']}/unlock", headers=test_data["headers"]
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "PENDING"


# --- Approve ---
@pytest.mark.anyio
async def test_approve_requires_lock_or_auto_locks(client, test_data):
    resp = await client.post(
        f"/api/v1/tickets/{test_data['t_id']}/approve", headers=test_data["headers"]
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "RUNNING"


# --- Deny ---
@pytest.mark.anyio
async def test_deny_with_reason(client, test_data, sync_db):
    deny_id = str(uuid.uuid4())
    deny_no = f"DENY-{uuid.uuid4().hex[:6]}"
    corr_id = f"corr-deny-{uuid.uuid4().hex[:8]}"
    sync_db.execute(
        """INSERT INTO tickets (id, ticket_no, type, status, source, correlation_id, created_at, updated_at) 
           VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())""",
        (deny_id, deny_no, "SR", "PENDING", "test", corr_id),
    )
    resp = await client.post(
        f"/api/v1/tickets/{deny_id}/deny",
        json={"reason": "Not authorized"},
        headers=test_data["headers"],
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "DENIED"


# --- Analytics ---
@pytest.mark.anyio
async def test_analytics(client, test_data):
    resp = await client.get("/api/v1/analytics", headers=test_data["headers"])
    assert resp.status_code == 200
    data = resp.json()
    assert "total_processed" in data
    assert "volume_trend" in data
    assert "category_distribution" in data


# --- Webhook ---
@pytest.mark.anyio
async def test_webhook(client, test_data):
    resp = await client.post(
        "/api/v1/itsm/webhook",
        json={
            "ticket_no": f"WH-{uuid.uuid4().hex[:6]}",
            "type": "SR",
            "assignment_group": "IT - Test",
            "created_by": "Webhook Test",
            "payload": {"category": "VPN Access"},
            "source": "webhook",
        },
    )
    assert resp.status_code == 200
    assert "correlation_id" in resp.json()
