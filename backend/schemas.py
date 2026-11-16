import json
import os
from typing import Optional, Any
from pydantic import BaseModel, Field

CATALOGUE_PATH = os.path.join(os.path.dirname(__file__), "automations.json")


def load_catalogue() -> list[dict]:
    with open(CATALOGUE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("automations", [])


def get_automation_by_id(auto_id: str) -> Optional[dict]:
    catalogue = load_catalogue()
    for item in catalogue:
        if item["id"] == auto_id:
            return item
    return None


# --- Schemas ---

class UserOut(BaseModel):
    username: str
    name: str
    role: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    user: UserOut


class AutomationInputDef(BaseModel):
    name: str
    label: str
    type: str = "string"
    placeholder: Optional[str] = None
    regex: Optional[str] = None
    description: Optional[str] = None


class AutomationItem(BaseModel):
    id: str
    name: str
    category: str
    os: str
    action: str
    description: str
    workflow_file: str
    git_ref: str
    enabled: bool = True
    requires_configuration: bool = False
    required_inputs: list[AutomationInputDef] = []
    optional_inputs: list[AutomationInputDef] = []
    github_input_mapping: dict[str, str] = {}


class CreateRequestPayload(BaseModel):
    automation_id: str
    sid: str
    parameters: dict[str, Any] = {}


class ReviewActionPayload(BaseModel):
    comment: Optional[str] = None


class RequestOut(BaseModel):
    id: str
    automation_id: str
    automation_name: str
    category: str
    os: str
    action: str
    sid: str
    parameters: dict[str, Any]
    status: str
    requested_by: str
    requested_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_comment: Optional[str] = None
    execution_id: Optional[str] = None


class ExecutionOut(BaseModel):
    id: str
    request_id: str
    automation_id: str
    workflow_file: str
    git_ref: str
    status: str
    github_run_id: Optional[str] = None
    github_run_url: Optional[str] = None
    dispatched_at: str
    completed_at: Optional[str] = None
    log_summary: Optional[str] = None
    # Joined request details for easy table display
    automation_name: Optional[str] = None
    sid: Optional[str] = None
    requested_by: Optional[str] = None
    reviewed_by: Optional[str] = None


class DashboardSummary(BaseModel):
    total_requests: int
    pending_approvals: int
    running_executions: int
    successful_executions: int
    failed_executions: int
