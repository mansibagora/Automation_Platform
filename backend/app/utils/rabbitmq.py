import logging
import json
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
from app.config import settings

logger = logging.getLogger(__name__)


async def get_connection():
    return await aio_pika.connect_robust(settings.rabbitmq_url)


async def setup_queues():
    conn = await get_connection()
    channel = await conn.channel()
    dlx = await channel.declare_exchange("itsm_dlx", ExchangeType.DIRECT, durable=True)
    dl_queue = await channel.declare_queue("itsm_dead_letter", durable=True)
    await dl_queue.bind(dlx, routing_key="itsm_dead_letter")
    await channel.declare_queue(
        "itsm_incoming",
        durable=True,
        arguments={
            "x-dead-letter-exchange": "itsm_dlx",
            "x-dead-letter-routing-key": "itsm_dead_letter",
        },
    )
    logger.info("RabbitMQ queues configured")
    await channel.close()
    await conn.close()


async def publish(queue_name: str, message_body: dict, correlation_id: str):
    conn = await get_connection()
    channel = await conn.channel()
    try:
        message = Message(
            body=json.dumps(message_body).encode(),
            delivery_mode=DeliveryMode.PERSISTENT,
            correlation_id=correlation_id,
            content_type="application/json",
        )
        await channel.default_exchange.publish(message, routing_key=queue_name)
        logger.info(f"Published to {queue_name} correlation_id={correlation_id}")
    finally:
        await channel.close()
        await conn.close()


async def check_connection() -> bool:
    try:
        conn = await get_connection()
        await conn.close()
        return True
    except Exception:
        return False
