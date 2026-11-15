from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.utils.rabbitmq import check_connection as check_rmq

router = APIRouter()


@router.get("/health")
async def health():
    return {"status": "ok", "service": "itsm-automation-platform"}


@router.get("/ready")
async def ready(db: AsyncSession = Depends(get_db)):
    checks = {}
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"

    try:
        rmq_ok = await check_rmq()
        checks["rabbitmq"] = "ok" if rmq_ok else "error"
    except Exception as e:
        checks["rabbitmq"] = f"error: {e}"

    all_ok = all(v == "ok" for v in checks.values())
    return {"status": "ok" if all_ok else "degraded", "checks": checks}
