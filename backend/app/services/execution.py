import abc
import asyncio
import random
import uuid
import logging
import shutil
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Ticket, ExecutionLog
from app.services.approval import transition_ticket
from app.config import settings

logger = logging.getLogger(__name__)


class ExecutionEngine(abc.ABC):
    @abc.abstractmethod
    async def execute(self, target: str, params: dict) -> dict:
        ...

    @abc.abstractmethod
    async def get_status(self, job_id: str) -> dict:
        ...


class MockExecutor(ExecutionEngine):
    def __init__(self, success_rate: float = 0.85):
        self.success_rate = success_rate

    async def execute(self, target: str, params: dict) -> dict:
        delay = random.uniform(1.0, 3.0)
        await asyncio.sleep(delay)
        success = random.random() < self.success_rate
        return {
            "success": success,
            "job_id": f"mock-{uuid.uuid4().hex[:8]}",
            "output": f"Mock execution of '{target}' {'succeeded' if success else 'failed'} after {delay:.1f}s",
            "duration": delay,
        }

    async def get_status(self, job_id: str) -> dict:
        return {"job_id": job_id, "status": "COMPLETED"}


class GitHubActionsExecutor(ExecutionEngine):
    def __init__(self):
        self.token = settings.github_token
        self.repo = settings.github_repo

    async def execute(self, target: str, params: dict) -> dict:
        if not self.token or not self.repo:
            logger.warning("GitHub Actions: token/repo not configured, falling back to mock")
            return {
                "success": True,
                "job_id": f"gh-mock-{uuid.uuid4().hex[:8]}",
                "output": "GitHub Actions not configured. Simulated success.",
                "duration": 0.1,
            }

        import httpx
        url = f"https://api.github.com/repos/{self.repo}/actions/workflows/{target}/dispatches"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github.v3+json",
        }
        body = {"ref": params.get("ref", "main"), "inputs": params.get("inputs", {})}

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=body, headers=headers, timeout=30)
                if resp.status_code == 204:
                    return {
                        "success": True,
                        "job_id": f"gh-{uuid.uuid4().hex[:8]}",
                        "output": f"GitHub Actions workflow '{target}' dispatched successfully",
                        "duration": 0,
                    }
                return {
                    "success": False,
                    "job_id": None,
                    "output": f"GitHub API error: {resp.status_code} {resp.text}",
                    "duration": 0,
                }
        except Exception as e:
            return {"success": False, "job_id": None, "output": str(e), "duration": 0}

    async def get_status(self, job_id: str) -> dict:
        return {"job_id": job_id, "status": "UNKNOWN"}


class AnsibleExecutor(ExecutionEngine):
    async def execute(self, target: str, params: dict) -> dict:
        if not shutil.which("ansible-playbook"):
            logger.warning("Ansible not installed, falling back to mock")
            return {
                "success": True,
                "job_id": f"ansible-mock-{uuid.uuid4().hex[:8]}",
                "output": "Ansible not installed. Simulated success.",
                "duration": 0.1,
            }

        extra_vars = " ".join(f"{k}={v}" for k, v in params.items())
        cmd = f"ansible-playbook {target} -e '{extra_vars}'"
        try:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            success = proc.returncode == 0
            return {
                "success": success,
                "job_id": f"ansible-{uuid.uuid4().hex[:8]}",
                "output": stdout.decode() + stderr.decode(),
                "duration": 0,
            }
        except Exception as e:
            return {"success": False, "job_id": None, "output": str(e), "duration": 0}

    async def get_status(self, job_id: str) -> dict:
        return {"job_id": job_id, "status": "UNKNOWN"}


def get_executor(engine_name: str, config: dict | None = None) -> ExecutionEngine:
    if engine_name == "mock":
        rate = (config or {}).get("success_rate", 0.85)
        return MockExecutor(success_rate=rate)
    elif engine_name == "github_actions":
        return GitHubActionsExecutor()
    elif engine_name == "ansible":
        return AnsibleExecutor()
    else:
        logger.warning(f"Unknown engine '{engine_name}', using mock")
        return MockExecutor()


async def run_execution(
    db: AsyncSession,
    ticket: Ticket,
    automation: dict,
):
    """Execute automation and update ticket/execution log."""
    engine_name = automation["target_engine"]
    engine_config = automation.get(engine_name, {})
    target = engine_config.get("workflow") or engine_config.get("playbook") or engine_config.get("target_identifier", engine_name)

    executor = get_executor(engine_name, engine_config)

    exec_log = ExecutionLog(
        id=uuid.uuid4(),
        ticket_id=ticket.id,
        engine=engine_name,
        target_identifier=target,
        status="RUNNING",
        input_parameters=ticket.payload,
        started_at=datetime.now(timezone.utc),
    )
    db.add(exec_log)
    await db.commit()

    try:
        params = ticket.payload or {}
        if engine_name == "github_actions":
            params = {"ref": engine_config.get("ref", "main"), "inputs": ticket.payload or {}}
        
        result = await executor.execute(target, params)

        exec_log.status = "COMPLETED" if result["success"] else "FAILED"
        exec_log.external_job_id = result.get("job_id")
        exec_log.output_log = result.get("output", "")
        exec_log.completed_at = datetime.now(timezone.utc)

        new_status = "COMPLETED" if result["success"] else "FAILED"
        await transition_ticket(db, ticket, new_status, metadata={"job_id": result.get("job_id")})
        await db.commit()

    except Exception as e:
        logger.error(f"Execution error for ticket {ticket.ticket_no}: {e}")
        exec_log.status = "FAILED"
        exec_log.output_log = str(e)
        exec_log.completed_at = datetime.now(timezone.utc)
        await transition_ticket(db, ticket, "FAILED", metadata={"error": str(e)})
        await db.commit()
