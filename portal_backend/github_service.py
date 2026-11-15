import logging
import uuid
from datetime import datetime, timezone
import httpx
from portal_backend.config import settings
from portal_backend.database import get_db, log_audit

logger = logging.getLogger("github_service")


async def dispatch_workflow(
    request_id: str,
    automation: dict,
    sid: str,
    parameters: dict,
    operator: str
) -> dict:
    """
    Triggers GitHub Actions workflow via repository dispatch with fixed action and parameters.
    Returns: { "execution_id": str, "status": str, "github_run_id": str | None, "github_run_url": str | None, "error": str | None }
    """
    exec_id = f"exec-{uuid.uuid4().hex[:8]}"
    workflow_file = automation["workflow_file"]
    git_ref = automation.get("git_ref", "main")
    fixed_action = automation["action"]

    # 1. Prepare exact inputs mapped according to automation definition
    # Strictly enforce fixed action so user input cannot override it
    inputs = {
        "sid": sid,
        "action": fixed_action,
        "request_id": request_id,
        "dispatched_by": operator,
    }

    mapping = automation.get("github_input_mapping", {})
    for param_key, mapped_name in mapping.items():
        if param_key == "action":
            inputs[mapped_name] = fixed_action
        elif param_key == "sid":
            inputs[mapped_name] = sid
        elif param_key in parameters and parameters[param_key] is not None:
            inputs[mapped_name] = str(parameters[param_key])

    now_iso = datetime.now(timezone.utc).isoformat()

    # 2. Check if token & repo configured
    if not settings.github_token or not settings.github_repo:
        # Graceful development mock mode: Record simulated queued execution with clear trace
        log_msg = f"[MOCK DISPATCH] GitHub Token/Repo not configured. Simulated dispatch for {workflow_file} with inputs: {inputs}"
        logger.info(log_msg)

        simulated_run_id = f"mock-run-{uuid.uuid4().hex[:6]}"
        simulated_run_url = f"https://github.com/mock-org/mock-repo/actions/runs/{simulated_run_id}"

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO executions (id, request_id, automation_id, workflow_file, git_ref, status, github_run_id, github_run_url, dispatched_at, log_summary)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (exec_id, request_id, automation["id"], workflow_file, git_ref, "QUEUED", simulated_run_id, simulated_run_url, now_iso, log_msg)
        )
        conn.commit()
        conn.close()

        log_audit(request_id, operator, "GITHUB_WORKFLOW_DISPATCHED", f"Simulated run {simulated_run_id}")
        return {
            "execution_id": exec_id,
            "status": "QUEUED",
            "github_run_id": simulated_run_id,
            "github_run_url": simulated_run_url,
            "error": None
        }

    # 3. Real GitHub API Call
    url = f"https://api.github.com/repos/{settings.github_repo}/actions/workflows/{workflow_file}/dispatches"
    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    body = {
        "ref": git_ref,
        "inputs": inputs,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=body, headers=headers)

            if resp.status_code == 204:
                # Dispatched successfully. Next, query runs list to find the matching run
                run_id = None
                run_url = None

                # Safely attempt to fetch the recent run
                runs_url = f"https://api.github.com/repos/{settings.github_repo}/actions/workflows/{workflow_file}/runs?per_page=1"
                runs_resp = await client.get(runs_url, headers=headers)
                if runs_resp.status_code == 200:
                    runs_data = runs_resp.json().get("workflow_runs", [])
                    if runs_data:
                        run_id = str(runs_data[0].get("id"))
                        run_url = runs_data[0].get("html_url")

                if not run_url and run_id:
                    run_url = f"https://github.com/{settings.github_repo}/actions/runs/{run_id}"

                conn = get_db()
                cursor = conn.cursor()
                cursor.execute(
                    """INSERT INTO executions (id, request_id, automation_id, workflow_file, git_ref, status, github_run_id, github_run_url, dispatched_at, log_summary)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (exec_id, request_id, automation["id"], workflow_file, git_ref, "QUEUED", run_id, run_url, now_iso, "Workflow dispatched successfully via GitHub REST API")
                )
                conn.commit()
                conn.close()

                log_audit(request_id, operator, "GITHUB_WORKFLOW_DISPATCHED", f"Workflow {workflow_file} dispatched. Run: {run_id or 'pending'}")
                return {
                    "execution_id": exec_id,
                    "status": "QUEUED",
                    "github_run_id": run_id,
                    "github_run_url": run_url,
                    "error": None
                }
            else:
                error_msg = f"GitHub API error {resp.status_code}: {resp.text}"
                logger.error(error_msg)

                conn = get_db()
                cursor = conn.cursor()
                cursor.execute(
                    """INSERT INTO executions (id, request_id, automation_id, workflow_file, git_ref, status, github_run_id, github_run_url, dispatched_at, log_summary)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (exec_id, request_id, automation["id"], workflow_file, git_ref, "FAILED", None, None, now_iso, error_msg)
                )
                conn.commit()
                conn.close()

                log_audit(request_id, operator, "GITHUB_DISPATCH_FAILED", error_msg)
                return {
                    "execution_id": exec_id,
                    "status": "FAILED",
                    "github_run_id": None,
                    "github_run_url": None,
                    "error": error_msg
                }

    except Exception as e:
        err = f"Exception connecting to GitHub: {str(e)}"
        logger.error(err)
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO executions (id, request_id, automation_id, workflow_file, git_ref, status, github_run_id, github_run_url, dispatched_at, log_summary)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (exec_id, request_id, automation["id"], workflow_file, git_ref, "FAILED", None, None, now_iso, err)
        )
        conn.commit()
        conn.close()

        log_audit(request_id, operator, "GITHUB_DISPATCH_EXCEPTION", err)
        return {
            "execution_id": exec_id,
            "status": "FAILED",
            "github_run_id": None,
            "github_run_url": None,
            "error": err
        }


async def sync_execution_status(execution_id: str, operator: str) -> dict:
    """
    Syncs execution status with GitHub Actions Run API.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM executions WHERE id = ?", (execution_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return {"error": "Execution not found"}

    req_id = row["request_id"]
    curr_status = row["status"]
    run_id = row["github_run_id"]

    # If mock run, transition sensibly for simulation: QUEUED -> RUNNING -> COMPLETED
    if not settings.github_token or not settings.github_repo or (run_id and "mock" in run_id):
        new_status = "COMPLETED" if curr_status == "RUNNING" else "RUNNING"
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "UPDATE executions SET status = ?, completed_at = ? WHERE id = ?",
            (new_status, now_iso if new_status == "COMPLETED" else None, execution_id)
        )
        cursor.execute("UPDATE automation_requests SET status = ? WHERE id = ?", (new_status, req_id))
        conn.commit()
        conn.close()
        log_audit(req_id, operator, "EXECUTION_STATUS_SYNCED", f"Mock updated to {new_status}")
        return {"status": new_status, "github_run_id": run_id}

    # Query real GitHub API
    if not run_id:
        conn.close()
        return {"status": curr_status, "message": "No GitHub Run ID associated to sync"}

    url = f"https://api.github.com/repos/{settings.github_repo}/actions/runs/{run_id}"
    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github.v3+json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                gh_status = data.get("status")  # queued, in_progress, completed
                conclusion = data.get("conclusion")  # success, failure, cancelled

                new_status = "RUNNING"
                if gh_status == "queued":
                    new_status = "QUEUED"
                elif gh_status == "in_progress":
                    new_status = "RUNNING"
                elif gh_status == "completed":
                    if conclusion == "success":
                        new_status = "COMPLETED"
                    elif conclusion in ("failure", "cancelled", "timed_out"):
                        new_status = "FAILED"
                    else:
                        new_status = "COMPLETED"

                now_iso = datetime.now(timezone.utc).isoformat()
                cursor.execute(
                    "UPDATE executions SET status = ?, completed_at = ? WHERE id = ?",
                    (new_status, now_iso if new_status in ("COMPLETED", "FAILED") else None, execution_id)
                )
                cursor.execute("UPDATE automation_requests SET status = ? WHERE id = ?", (new_status, req_id))
                conn.commit()
                conn.close()

                log_audit(req_id, operator, "EXECUTION_STATUS_SYNCED", f"Status updated to {new_status} (GitHub: {gh_status}/{conclusion})")
                return {"status": new_status, "github_run_id": run_id, "conclusion": conclusion}
            else:
                conn.close()
                return {"status": curr_status, "error": f"GitHub returned {resp.status_code}"}
    except Exception as e:
        conn.close()
        return {"status": curr_status, "error": str(e)}
