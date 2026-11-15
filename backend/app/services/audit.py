import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AuditLog


async def log_audit(
    db: AsyncSession,
    action: str,
    ticket_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    previous_state: str | None = None,
    new_state: str | None = None,
    metadata: dict | None = None,
):
    entry = AuditLog(
        id=uuid.uuid4(),
        ticket_id=ticket_id,
        user_id=user_id,
        action=action,
        previous_state=previous_state,
        new_state=new_state,
        timestamp=datetime.now(timezone.utc),
        metadata_=metadata,
    )
    db.add(entry)
