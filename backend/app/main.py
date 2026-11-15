import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.utils.rabbitmq import setup_queues

logging.basicConfig(level=getattr(logging, settings.log_level), format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ITSM Automation Platform...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified")

    try:
        await setup_queues()
        logger.info("RabbitMQ queues configured")
    except Exception as e:
        logger.warning(f"RabbitMQ setup skipped: {e}")

    yield

    # Shutdown
    await engine.dispose()
    logger.info("ITSM Automation Platform shut down")


app = FastAPI(
    title="ITSM Automation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.tickets import router as tickets_router
from app.api.webhook import router as webhook_router
from app.api.mock_helix import router as mock_helix_router
from app.api.analytics import router as analytics_router

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(tickets_router)
app.include_router(webhook_router)
app.include_router(mock_helix_router)
app.include_router(analytics_router)
