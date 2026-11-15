import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import WebhookPayload
from app.utils.rabbitmq import publish
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/itsm", tags=["itsm"])


@router.post("/webhook")
async def receive_webhook(payload: WebhookPayload, db: AsyncSession = Depends(get_db)):
    correlation_id = f"corr-{uuid.uuid4().hex[:12]}"
    message = {
        "ticket_no": payload.ticket_no,
        "type": payload.type,
        "assignment_group": payload.assignment_group,
        "created_by": payload.created_by,
        "payload": payload.payload or {},
        "source": payload.source,
        "correlation_id": correlation_id,
    }
    await publish("itsm_incoming", message, correlation_id)
    return {"correlation_id": correlation_id, "status": "queued"}
