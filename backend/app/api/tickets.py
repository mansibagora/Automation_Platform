import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db, async_session
from app.models import Ticket, User, ExecutionLog, AuditLog
from app.schemas import TicketOut, TicketListResponse, DenyRequest, ExecutionLogOut, AuditLogOut
from app.api.deps import get_current_user
from app.services.approval import (
    lock_ticket, unlock_ticket, transition_ticket,
    LockConflictError, InvalidTransitionError,
)
from app.services.mapping import match_automation
from app.services.execution import run_execution

router = APIRouter(prefix="/api/v1/tickets", tags=["tickets"])


def ticket_to_out(t: Ticket) -> TicketOut:
    data = TicketOut.model_validate(t)
    if t.locked_by:
        data.locked_by_username = t.locked_by.username
    return data


@router.get("", response_model=TicketListResponse)
async def list_tickets(
    status: str | None = Query(None),
    type: str | None = Query(None),
    assignment_group: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Ticket)
    count_q = select(func.count(Ticket.id))

    if status:
        q = q.where(Ticket.status == status)
        count_q = count_q.where(Ticket.status == status)
    if type:
        q = q.where(Ticket.type == type)
        count_q = count_q.where(Ticket.type == type)
    if assignment_group:
        q = q.where(Ticket.assignment_group == assignment_group)
        count_q = count_q.where(Ticket.assignment_group == assignment_group)

    total = (await db.execute(count_q)).scalar() or 0
    q = q.order_by(Ticket.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(q)
    tickets = result.scalars().all()

    return TicketListResponse(
        tickets=[ticket_to_out(t) for t in tickets],
        total=total, page=page, page_size=page_size,
    )


@router.get("/{ticket_id}", response_model=TicketOut)
async def get_ticket(ticket_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket_to_out(ticket)


@router.post("/{ticket_id}/lock", response_model=TicketOut)
async def lock(ticket_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        ticket = await lock_ticket(db, ticket_id, user)
        await db.commit()
        return ticket_to_out(ticket)
    except LockConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{ticket_id}/unlock", response_model=TicketOut)
async def unlock(ticket_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        ticket = await unlock_ticket(db, ticket_id, user)
        await db.commit()
        return ticket_to_out(ticket)
    except LockConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{ticket_id}/approve", response_model=TicketOut)
async def approve(ticket_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Auto-lock if pending
    if ticket.status == "PENDING":
        try:
            ticket = await lock_ticket(db, ticket_id, user)
        except (LockConflictError, InvalidTransitionError) as e:
            raise HTTPException(status_code=409, detail=str(e))

    if ticket.status != "LOCKED":
        raise HTTPException(status_code=400, detail=f"Ticket must be LOCKED to approve, current: {ticket.status}")
    if ticket.locked_by_user_id != user.id:
        raise HTTPException(status_code=409, detail="You must hold the lock to approve")

    try:
        ticket = await transition_ticket(db, ticket, "APPROVED", user)
        ticket = await transition_ticket(db, ticket, "RUNNING", user)
        await db.commit()
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Find matching automation and execute in background
    automation = match_automation(ticket.payload or {})
    if automation:
        async def _run():
            async with async_session() as session:
                res = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
                t = res.scalar_one()
                await run_execution(session, t, automation)
        asyncio.create_task(_run())
    else:
        # No automation matched, complete immediately
        async def _complete():
            async with async_session() as session:
                res = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
                t = res.scalar_one()
                await transition_ticket(session, t, "COMPLETED", metadata={"note": "No automation matched"})
                await session.commit()
        asyncio.create_task(_complete())

    # Re-fetch to return current state
    await db.refresh(ticket)
    return ticket_to_out(ticket)


@router.post("/{ticket_id}/deny", response_model=TicketOut)
async def deny(ticket_id: uuid.UUID, req: DenyRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status not in ("PENDING", "LOCKED"):
        raise HTTPException(status_code=400, detail=f"Cannot deny ticket in status {ticket.status}")
    if ticket.status == "LOCKED" and ticket.locked_by_user_id != user.id:
        raise HTTPException(status_code=409, detail="Ticket is locked by another user")

    try:
        ticket = await transition_ticket(db, ticket, "DENIED", user, metadata={"reason": req.reason})
        await db.commit()
        return ticket_to_out(ticket)
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{ticket_id}/retry", response_model=TicketOut)
async def retry(ticket_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status != "FAILED":
        raise HTTPException(status_code=400, detail="Only FAILED tickets can be retried")

    try:
        ticket = await transition_ticket(db, ticket, "RUNNING", user)
        await db.commit()
    except InvalidTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))

    automation = match_automation(ticket.payload or {})
    if automation:
        async def _run():
            async with async_session() as session:
                res = await session.execute(select(Ticket).where(Ticket.id == ticket_id))
                t = res.scalar_one()
                await run_execution(session, t, automation)
        asyncio.create_task(_run())

    return ticket_to_out(ticket)


@router.get("/{ticket_id}/executions", response_model=list[ExecutionLogOut])
async def get_executions(ticket_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(ExecutionLog).where(ExecutionLog.ticket_id == ticket_id).order_by(ExecutionLog.started_at.desc())
    )
    return [ExecutionLogOut.model_validate(e) for e in result.scalars().all()]


@router.get("/{ticket_id}/audit", response_model=list[AuditLogOut])
async def get_audit(ticket_id: uuid.UUID, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(AuditLog).where(AuditLog.ticket_id == ticket_id).order_by(AuditLog.timestamp.desc())
    )
    logs = result.scalars().all()
    out = []
    for log in logs:
        a = AuditLogOut.model_validate(log)
        if log.user:
            a.username = log.user.username
        out.append(a)
    return out
