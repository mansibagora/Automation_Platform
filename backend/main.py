import logging
import uuid
import re
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, get_db, log_audit
from schemas import (
    load_catalogue, get_automation_by_id,
    UserOut, LoginRequest, TokenResponse,
    AutomationItem, CreateRequestPayload, ReviewActionPayload,
    RequestOut, ExecutionOut, DashboardSummary
)
from auth import get_current_user
from github_service import dispatch_workflow, sync_execution_status

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("portal_main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Lightweight Infrastructure Automation Portal backend...")
    init_db()
    logger.info("SQLite database verified and initialized.")
    yield
    logger.info("Shutting down Infrastructure Automation Portal backend.")


app = FastAPI(
    title="Lightweight Infrastructure Automation Portal",
    version="1.0.0",
    description="Clean, lightweight portal for SAP & Oracle infrastructure automation approval and GitHub dispatch.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- 1. System Health ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "lightweight-automation-portal"}


# --- 2. Auth Endpoints ---

@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(req: LoginRequest):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT username, name, role, password_hash FROM users WHERE username = ?", (req.username,))
    row = cursor.fetchone()
    conn.close()

    if not row or row["password_hash"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_out = UserOut(username=row["username"], name=row["name"], role=row["role"])
    return TokenResponse(access_token=user_out.username, user=user_out)


@app.get("/api/v1/auth/me", response_model=UserOut)
def me(user: UserOut = Depends(get_current_user)):
    return user


# --- 3. Automation Catalogue ---

@app.get("/api/v1/automations", response_model=list[AutomationItem])
def list_automations():
    return load_catalogue()


@app.get("/api/v1/automations/{automation_id}", response_model=AutomationItem)
def get_automation(automation_id: str):
    auto = get_automation_by_id(automation_id)
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found in catalogue")
    return auto


# --- 4. Request Management ---

@app.post("/api/v1/requests", response_model=RequestOut)
def create_request(payload: CreateRequestPayload, user: UserOut = Depends(get_current_user)):
    auto = get_automation_by_id(payload.automation_id)
    if not auto:
        raise HTTPException(status_code=404, detail="Invalid automation ID")

    if not auto.get("enabled", True):
        raise HTTPException(status_code=400, detail="This automation is currently disabled")

    # Validate SID
    sid = payload.sid.strip().upper()
    if not sid:
        raise HTTPException(status_code=422, detail="SID is required")

    # Validate dynamic required inputs
    for req_field in auto.get("required_inputs", []):
        field_name = req_field["name"]
        val = payload.parameters.get(field_name)
        if field_name == "sid":
            val = sid
        if not val or not str(val).strip():
            raise HTTPException(status_code=422, detail=f"Required parameter '{req_field['label']}' is missing")

        regex = req_field.get("regex")
        if regex and not re.match(regex, str(val).strip(), re.IGNORECASE):
            raise HTTPException(status_code=422, detail=f"Parameter '{req_field['label']}' format invalid. Expected: {req_field.get('description', regex)}")

    req_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()
    params = payload.parameters.copy()
    params["sid"] = sid
    # Enforce fixed action
    params["action"] = auto["action"]

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO automation_requests
           (id, automation_id, automation_name, category, os, action, sid, parameters_json, status, requested_by, requested_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (req_id, auto["id"], auto["name"], auto["category"], auto["os"], auto["action"], sid, json.dumps(params), "PENDING_APPROVAL", user.username, now_iso)
    )
    conn.commit()
    conn.close()

    log_audit(req_id, user.username, "REQUEST_CREATED", f"{auto['name']} for SID={sid}")

    return RequestOut(
        id=req_id,
        automation_id=auto["id"],
        automation_name=auto["name"],
        category=auto["category"],
        os=auto["os"],
        action=auto["action"],
        sid=sid,
        parameters=params,
        status="PENDING_APPROVAL",
        requested_by=user.username,
        requested_at=now_iso,
    )


@app.get("/api/v1/requests", response_model=list[RequestOut])
def list_requests(status: Optional[str] = None, user: UserOut = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()
    if status:
        cursor.execute("SELECT * FROM automation_requests WHERE status = ? ORDER BY requested_at DESC", (status.upper(),))
    else:
        cursor.execute("SELECT * FROM automation_requests ORDER BY requested_at DESC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append(RequestOut(
            id=r["id"],
            automation_id=r["automation_id"],
            automation_name=r["automation_name"],
            category=r["category"],
            os=r["os"],
            action=r["action"],
            sid=r["sid"],
            parameters=json.loads(r["parameters_json"]),
            status=r["status"],
            requested_by=r["requested_by"],
            requested_at=r["requested_at"],
            reviewed_by=r["reviewed_by"],
            reviewed_at=r["reviewed_at"],
            review_comment=r["review_comment"],
            execution_id=r["execution_id"],
        ))
    return results


@app.get("/api/v1/approvals/pending", response_model=list[RequestOut])
def list_pending_approvals(user: UserOut = Depends(get_current_user)):
    return list_requests(status="PENDING_APPROVAL", user=user)


# --- 5. Approvals & Rejections ---

@app.post("/api/v1/requests/{request_id}/approve", response_model=RequestOut)
async def approve_request(request_id: str, payload: ReviewActionPayload = ReviewActionPayload(), user: UserOut = Depends(get_current_user)):
    # 1. Role enforcement
    if user.role not in ("approver", "admin"):
        raise HTTPException(status_code=403, detail="Permission denied: Only designated approvers can approve requests")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM automation_requests WHERE id = ?", (request_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Request not found")

    if row["status"] != "PENDING_APPROVAL":
        conn.close()
        raise HTTPException(status_code=409, detail=f"Cannot approve request with status '{row['status']}'")

    now_iso = datetime.now(timezone.utc).isoformat()
    auto = get_automation_by_id(row["automation_id"])
    if not auto:
        conn.close()
        raise HTTPException(status_code=400, detail="Automation catalogue definition missing")

    # 2. Update status to APPROVED to prevent duplicate triggers
    cursor.execute(
        """UPDATE automation_requests
           SET status = 'APPROVED', reviewed_by = ?, reviewed_at = ?, review_comment = ?
           WHERE id = ?""",
        (user.username, now_iso, payload.comment, request_id)
    )
    conn.commit()
    conn.close()

    log_audit(request_id, user.username, "REQUEST_APPROVED", payload.comment or "Approved")

    # 3. Trigger GitHub Actions workflow
    params = json.loads(row["parameters_json"])
    dispatch_res = await dispatch_workflow(
        request_id=request_id,
        automation=auto,
        sid=row["sid"],
        parameters=params,
        operator=user.username
    )

    # 4. Link execution and update request status to RUNNING (or FAILED if dispatch rejected)
    final_status = "RUNNING" if dispatch_res["status"] in ("QUEUED", "RUNNING") else "FAILED"

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE automation_requests SET status = ?, execution_id = ? WHERE id = ?",
        (final_status, dispatch_res["execution_id"], request_id)
    )
    cursor.execute("SELECT * FROM automation_requests WHERE id = ?", (request_id,))
    updated_row = cursor.fetchone()
    conn.commit()
    conn.close()

    return RequestOut(
        id=updated_row["id"],
        automation_id=updated_row["automation_id"],
        automation_name=updated_row["automation_name"],
        category=updated_row["category"],
        os=updated_row["os"],
        action=updated_row["action"],
        sid=updated_row["sid"],
        parameters=json.loads(updated_row["parameters_json"]),
        status=updated_row["status"],
        requested_by=updated_row["requested_by"],
        requested_at=updated_row["requested_at"],
        reviewed_by=updated_row["reviewed_by"],
        reviewed_at=updated_row["reviewed_at"],
        review_comment=updated_row["review_comment"],
        execution_id=updated_row["execution_id"],
    )


@app.post("/api/v1/requests/{request_id}/reject", response_model=RequestOut)
def reject_request(request_id: str, payload: ReviewActionPayload = ReviewActionPayload(), user: UserOut = Depends(get_current_user)):
    if user.role not in ("approver", "admin"):
        raise HTTPException(status_code=403, detail="Permission denied: Only designated approvers can reject requests")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM automation_requests WHERE id = ?", (request_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Request not found")

    if row["status"] != "PENDING_APPROVAL":
        conn.close()
        raise HTTPException(status_code=409, detail=f"Cannot reject request with status '{row['status']}'")

    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        """UPDATE automation_requests
           SET status = 'REJECTED', reviewed_by = ?, reviewed_at = ?, review_comment = ?
           WHERE id = ?""",
        (user.username, now_iso, payload.comment or "Rejected by approver", request_id)
    )
    cursor.execute("SELECT * FROM automation_requests WHERE id = ?", (request_id,))
    updated_row = cursor.fetchone()
    conn.commit()
    conn.close()

    log_audit(request_id, user.username, "REQUEST_REJECTED", payload.comment or "Rejected")

    return RequestOut(
        id=updated_row["id"],
        automation_id=updated_row["automation_id"],
        automation_name=updated_row["automation_name"],
        category=updated_row["category"],
        os=updated_row["os"],
        action=updated_row["action"],
        sid=updated_row["sid"],
        parameters=json.loads(updated_row["parameters_json"]),
        status=updated_row["status"],
        requested_by=updated_row["requested_by"],
        requested_at=updated_row["requested_at"],
        reviewed_by=updated_row["reviewed_by"],
        reviewed_at=updated_row["reviewed_at"],
        review_comment=updated_row["review_comment"],
        execution_id=updated_row["execution_id"],
    )


# --- 6. Execution Monitoring & History ---

@app.get("/api/v1/executions", response_model=list[ExecutionOut])
def list_executions(
    automation_id: Optional[str] = None,
    status: Optional[str] = None,
    user: UserOut = Depends(get_current_user)
):
    conn = get_db()
    cursor = conn.cursor()

    query = """
    SELECT e.*, r.automation_name, r.sid, r.requested_by, r.reviewed_by
    FROM executions e
    JOIN automation_requests r ON e.request_id = r.id
    WHERE 1=1
    """
    params = []
    if automation_id:
        query += " AND e.automation_id = ?"
        params.append(automation_id)
    if status:
        query += " AND e.status = ?"
        params.append(status.upper())

    query += " ORDER BY e.dispatched_at DESC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append(ExecutionOut(
            id=r["id"],
            request_id=r["request_id"],
            automation_id=r["automation_id"],
            workflow_file=r["workflow_file"],
            git_ref=r["git_ref"],
            status=r["status"],
            github_run_id=r["github_run_id"],
            github_run_url=r["github_run_url"],
            dispatched_at=r["dispatched_at"],
            completed_at=r["completed_at"],
            log_summary=r["log_summary"],
            automation_name=r["automation_name"],
            sid=r["sid"],
            requested_by=r["requested_by"],
            reviewed_by=r["reviewed_by"]
        ))
    return results


@app.post("/api/v1/executions/{execution_id}/sync")
async def sync_execution(execution_id: str, user: UserOut = Depends(get_current_user)):
    res = await sync_execution_status(execution_id, user.username)
    return res


# --- 7. Dashboard Summary ---

@app.get("/api/v1/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(user: UserOut = Depends(get_current_user)):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT count(*) FROM automation_requests")
    total_reqs = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM automation_requests WHERE status = 'PENDING_APPROVAL'")
    pending_appr = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM executions WHERE status IN ('QUEUED', 'RUNNING')")
    running_execs = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM executions WHERE status = 'COMPLETED'")
    success_execs = cursor.fetchone()[0]

    cursor.execute("SELECT count(*) FROM executions WHERE status = 'FAILED'")
    failed_execs = cursor.fetchone()[0]

    conn.close()

    return DashboardSummary(
        total_requests=total_reqs,
        pending_approvals=pending_appr,
        running_executions=running_execs,
        successful_executions=success_execs,
        failed_executions=failed_execs,
    )
