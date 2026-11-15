"""
Standalone RabbitMQ consumer process.
Run with: python -m app.workers.consumer
"""
import asyncio
import json
import uuid
import logging
from datetime import datetime, timezone

import aio_pika
from sqlalchemy import select

from app.config import settings
from app.database import async_session, engine, Base
from app.models import Ticket, AuditLog
from app.services.mapping import match_automation
from app.services.audit import log_audit

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("consumer")


async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = json.loads(message.body.decode())
            ticket_no = body.get("ticket_no")
            correlation_id = body.get("correlation_id", message.correlation_id or f"corr-{uuid.uuid4().hex[:12]}")

            logger.info(f"Processing message: ticket_no={ticket_no} correlation_id={correlation_id}")

            async with async_session() as db:
                # Check duplicate
                existing = await db.execute(select(Ticket).where(Ticket.ticket_no == ticket_no))
                if existing.scalar_one_or_none():
                    logger.warning(f"Duplicate ticket_no={ticket_no}, skipping")
                    return

                # Create ticket
                ticket = Ticket(
                    id=uuid.uuid4(),
                    ticket_no=ticket_no,
                    type=body.get("type", "SR"),
                    status="PENDING",
                    assignment_group=body.get("assignment_group"),
                    created_by=body.get("created_by"),
                    payload=body.get("payload", {}),
                    source=body.get("source", "webhook"),
                    correlation_id=correlation_id,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(ticket)

                # Audit: TICKET_RECEIVED
                await log_audit(db, "TICKET_RECEIVED", ticket_id=ticket.id, new_state="PENDING",
                                metadata={"source": ticket.source, "ticket_no": ticket_no})

                # Match automation
                payload_for_match = body.get("payload", {})
                automation = match_automation(payload_for_match)
                if automation:
                    await log_audit(db, "TICKET_MAPPED", ticket_id=ticket.id,
                                    metadata={"automation": automation["name"], "engine": automation["target_engine"]})

                await db.commit()
                logger.info(f"Ticket {ticket_no} persisted with status PENDING")

        except Exception as e:
            logger.error(f"Error processing message: {e}", exc_info=True)
            raise


async def main():
    logger.info("Starting ITSM consumer worker...")

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=10)

    # Ensure queue exists
    queue = await channel.declare_queue(
        "itsm_incoming",
        durable=True,
        arguments={
            "x-dead-letter-exchange": "itsm_dlx",
            "x-dead-letter-routing-key": "itsm_dead_letter",
        },
    )

    logger.info("Consumer listening on queue 'itsm_incoming'...")
    await queue.consume(process_message)

    # Keep running
    try:
        await asyncio.Future()
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
