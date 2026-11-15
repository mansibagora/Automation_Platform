import csv
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, cast, Date
from app.database import get_db
from app.models import Ticket, ExecutionLog
from app.schemas import AnalyticsResponse
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("", response_model=AnalyticsResponse)
async def get_analytics(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    # Total tickets
    total = (await db.execute(select(func.count(Ticket.id)))).scalar() or 0
    completed = (await db.execute(select(func.count(Ticket.id)).where(Ticket.status == "COMPLETED"))).scalar() or 0
    failed = (await db.execute(select(func.count(Ticket.id)).where(Ticket.status == "FAILED"))).scalar() or 0
    denied = (await db.execute(select(func.count(Ticket.id)).where(Ticket.status == "DENIED"))).scalar() or 0
    running = (await db.execute(select(func.count(Ticket.id)).where(Ticket.status == "RUNNING"))).scalar() or 0
    pending = (await db.execute(select(func.count(Ticket.id)).where(Ticket.status == "PENDING"))).scalar() or 0

    suppressed = denied
    suppression_rate = round((suppressed / total * 100) if total > 0 else 0, 2)
    tickets_avoided = completed
    non_auto = failed + pending
    incidents_reopened = (await db.execute(
        select(func.count(ExecutionLog.id)).where(ExecutionLog.retry_count > 0)
    )).scalar() or 0

    # 30-day volume trend
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    trend_q = (
        select(
            cast(Ticket.created_at, Date).label("date"),
            func.count(Ticket.id).label("count"),
        )
        .where(Ticket.created_at >= thirty_days_ago)
        .group_by(cast(Ticket.created_at, Date))
        .order_by(cast(Ticket.created_at, Date))
    )
    trend_result = await db.execute(trend_q)
    volume_trend = [{"date": str(r.date), "count": r.count} for r in trend_result]

    # Category distribution from payload
    all_tickets = (await db.execute(select(Ticket.payload))).scalars().all()
    categories = {}
    for payload in all_tickets:
        if payload:
            cat = payload.get("category", "Uncategorized")
            categories[cat] = categories.get(cat, 0) + 1
    category_distribution = [{"category": k, "count": v} for k, v in categories.items()]

    return AnalyticsResponse(
        total_processed=total,
        backdated=0,
        suppressed=suppressed,
        suppression_rate=suppression_rate,
        tickets_avoided=tickets_avoided,
        non_auto_resolving=non_auto,
        incidents_reopened=incidents_reopened,
        volume_trend=volume_trend,
        category_distribution=category_distribution,
    )


@router.get("/export/csv")
async def export_csv(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Ticket).order_by(Ticket.created_at.desc()))
    tickets = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Ticket No", "Type", "Status", "Assignment Group", "Created By", "Created At", "Source", "Category"])
    for t in tickets:
        category = (t.payload or {}).get("category", "")
        writer.writerow([t.ticket_no, t.type, t.status, t.assignment_group, t.created_by, str(t.created_at), t.source, category])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics.csv"},
    )
