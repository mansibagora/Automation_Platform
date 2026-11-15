import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Ticket, User
from app.services.audit import log_audit
from app.config import settings


VALID_TRANSITIONS = {
    "PENDING": {"LOCKED", "DENIED"},
    "LOCKED": {"PENDING", "APPROVED", "DENIED"},
    "APPROVED": {"RUNNING"},
    "RUNNING": {"COMPLETED", "FAILED"},
    "FAILED": {"RUNNING"},
}


class LockConflictError(Exception):
    pass


class InvalidTransitionError(Exception):
    pass


def can_transition(current: str, target: str) -> bool:
    return target in VALID_TRANSITIONS.get(current, set())


async def lock_ticket(db: AsyncSession, ticket_id: uuid.UUID, user: User) -> Ticket:
    """Acquire row-level lock on a ticket using SELECT FOR UPDATE NOWAIT."""
    try:
        result = await db.execute(
            select(Ticket)
            .where(Ticket.id == ticket_id)
            .with_for_update(nowait=True)
        )
        ticket = result.scalar_one_or_none()
    except Exception:
        raise LockConflictError("Ticket is currently being modified by another transaction")

    if ticket is None:
        raise ValueError("Ticket not found")

    timeout = timedelta(minutes=settings.lock_timeout_minutes)

    # Check if already locked by another user
    if ticket.locked_by_user_id and ticket.locked_by_user_id != user.id:
        if ticket.locked_at and (datetime.now(timezone.utc) - ticket.locked_at) < timeout:
            raise LockConflictError(f"Ticket is locked by another user until lock expires")
        # Stale lock — break it

    if ticket.status not in ("PENDING", "LOCKED"):
        if ticket.status != "LOCKED" or ticket.locked_by_user_id != user.id:
            raise InvalidTransitionError(f"Cannot lock ticket in status {ticket.status}")

    previous = ticket.status
    ticket.status = "LOCKED"
    ticket.locked_by_user_id = user.id
    ticket.locked_at = datetime.now(timezone.utc)
    ticket.updated_at = datetime.now(timezone.utc)

    await log_audit(
        db, "TICKET_LOCKED", ticket_id=ticket.id, user_id=user.id,
        previous_state=previous, new_state="LOCKED"
    )
    await db.flush()
    return ticket


async def unlock_ticket(db: AsyncSession, ticket_id: uuid.UUID, user: User) -> Ticket:
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise ValueError("Ticket not found")
    if ticket.status != "LOCKED":
        raise InvalidTransitionError("Ticket is not locked")
    if ticket.locked_by_user_id != user.id:
        raise LockConflictError("You do not hold the lock on this ticket")

    previous = ticket.status
    ticket.status = "PENDING"
    ticket.locked_by_user_id = None
    ticket.locked_at = None
    ticket.updated_at = datetime.now(timezone.utc)

    await log_audit(
        db, "TICKET_UNLOCKED", ticket_id=ticket.id, user_id=user.id,
        previous_state=previous, new_state="PENDING"
    )
    await db.flush()
    return ticket


async def transition_ticket(
    db: AsyncSession, ticket: Ticket, new_status: str,
    user: User | None = None, metadata: dict | None = None
) -> Ticket:
    if not can_transition(ticket.status, new_status):
        raise InvalidTransitionError(f"Cannot transition from {ticket.status} to {new_status}")

    previous = ticket.status
    ticket.status = new_status
    ticket.updated_at = datetime.now(timezone.utc)

    if new_status in ("APPROVED", "DENIED", "COMPLETED", "FAILED"):
        ticket.locked_by_user_id = None
        ticket.locked_at = None

    action = f"TICKET_{new_status}"
    await log_audit(
        db, action, ticket_id=ticket.id,
        user_id=user.id if user else None,
        previous_state=previous, new_state=new_status,
        metadata=metadata,
    )
    await db.flush()
    return ticket
