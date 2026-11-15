import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, Any


# --- Auth ---
class LoginRequest(BaseModel):
    username: str
    token: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: str
    active: bool

    model_config = {"from_attributes": True}


# --- Ticket ---
class TicketOut(BaseModel):
    id: uuid.UUID
    ticket_no: str
    type: str
    status: str
    assignment_group: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    payload: Optional[dict] = None
    locked_by_user_id: Optional[uuid.UUID] = None
    locked_at: Optional[datetime] = None
    source: str
    correlation_id: str
    locked_by_username: Optional[str] = None

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    tickets: list[TicketOut]
    total: int
    page: int
    page_size: int


class DenyRequest(BaseModel):
    reason: str


# --- Webhook ---
class WebhookPayload(BaseModel):
    ticket_no: str
    type: str = "SR"
    assignment_group: Optional[str] = None
    created_by: Optional[str] = None
    payload: Optional[dict] = None
    source: str = "webhook"


# --- Execution ---
class ExecutionLogOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    engine: str
    target_identifier: str
    status: str
    external_job_id: Optional[str] = None
    input_parameters: Optional[dict] = None
    output_log: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    retry_count: int

    model_config = {"from_attributes": True}


# --- Audit ---
class AuditLogOut(BaseModel):
    id: uuid.UUID
    ticket_id: Optional[uuid.UUID] = None
    user_id: Optional[uuid.UUID] = None
    action: str
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    timestamp: datetime
    metadata_: Optional[dict] = Field(None, alias="metadata_")
    username: Optional[str] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


# --- Mock Helix ---
class MockHelixGenerateRequest(BaseModel):
    type: str = "SR"


class MockHelixSendRequest(BaseModel):
    payload: dict


class MockHelixResponse(BaseModel):
    payload: dict


class MockHelixSendResponse(BaseModel):
    correlation_id: str
    message: str


# --- Analytics ---
class AnalyticsResponse(BaseModel):
    total_processed: int
    backdated: int
    suppressed: int
    suppression_rate: float
    tickets_avoided: int
    non_auto_resolving: int
    incidents_reopened: int
    volume_trend: list[dict]
    category_distribution: list[dict]
