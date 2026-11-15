import uuid
import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import MockHelixGenerateRequest, MockHelixSendRequest, MockHelixResponse, MockHelixSendResponse
from app.utils.rabbitmq import publish
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/mock-helix", tags=["mock-helix"])

SAMPLE_GROUPS = [
    "IT - Cloud Administration - CTO",
    "IT - Network Operations",
    "IT - Security Operations",
    "IT - Service Desk",
]

SAMPLE_CATEGORIES = ["AWS Access", "VPN Access", "Server Provisioning", "Password Reset", "Software Installation"]
SAMPLE_NAMES = ["John Smith", "Jane Doe", "Bob Johnson", "Alice Williams", "Charlie Brown"]


def _generate_payload(ticket_type: str = "SR") -> dict:
    ritm = f"RITM{random.randint(1000000, 9999999)}"
    category = random.choice(SAMPLE_CATEGORIES)
    return {
        "ticket_no": ritm,
        "type": ticket_type,
        "assignment_group": random.choice(SAMPLE_GROUPS),
        "created_by": random.choice(SAMPLE_NAMES),
        "category": category,
        "payload": {
            "SOURCE": "ServiceNow",
            "RITM": ritm,
            "AWSAccountNumbers": f"{random.randint(100000000000, 999999999999)}",
            "UserName": f"user_{random.randint(1000, 9999)}",
            "Key": f"key-{uuid.uuid4().hex[:8]}",
            "AccessType": random.choice(["ReadOnly", "Admin", "PowerUser"]),
            "catalog_item": f"{category} Request",
            "description": f"Request for {category.lower()} access",
            "impact": random.choice(["Low", "Medium", "High"]),
            "priority": random.choice(["1 - Critical", "2 - High", "3 - Medium", "4 - Low"]),
            "opened_by": random.choice(SAMPLE_NAMES),
            "requested_for": random.choice(SAMPLE_NAMES),
            "assigned_to": random.choice(SAMPLE_NAMES),
        },
    }


@router.post("/generate", response_model=MockHelixResponse)
async def generate(req: MockHelixGenerateRequest = MockHelixGenerateRequest(), user: User = Depends(get_current_user)):
    return MockHelixResponse(payload=_generate_payload(req.type))


@router.post("/send", response_model=MockHelixSendResponse)
async def send(req: MockHelixSendRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    correlation_id = f"corr-{uuid.uuid4().hex[:12]}"
    message = {
        **req.payload,
        "correlation_id": correlation_id,
        "source": "mock_helix",
    }
    await publish("itsm_incoming", message, correlation_id)
    return MockHelixSendResponse(correlation_id=correlation_id, message="Payload published to pipeline")
