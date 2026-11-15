import logging
import json
import aio_pika
from aio_pika import Message, DeliveryMode, ExchangeType
from app.config import settings

logger = logging.getLogger(__name__)

_connection = None
_channel = None


async def get_connection():
    global _connection
    if _connection is None or _connection.is_closed:
        _connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    return _connection


async def setup_queues():
    """Setup durable queues with dead-letter exchange."""
    conn = await get_connection()
    channel = await conn.channel()

    # Dead-letter exchange and queue
    dlx = await channel.declare_exchange("itsm_dlx", ExchangeType.DIRECT, durable=True)
    dl_queue = await channel.declare_queue("itsm_dead_letter", durable=True)
    await dl_queue.bind(dlx, routing_key="itsm_dead_letter")

    # Main incoming queue with DLX
    await channel.declare_queue(
        "itsm_incoming",
        durable=True,
        arguments={
            "x-dead-letter-exchange": "itsm_dlx",
            "x-dead-letter-routing-key": "itsm_dead_letter",
        },
    )
    logger.info("RabbitMQ queues configured successfully")
    await channel.close()


async def publish(queue_name: str, message_body: dict, correlation_id: str):
    """Publish a message to the specified queue."""
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
        logger.info(f"Published message to {queue_name} with correlation_id={correlation_id}")
    finally:
        await channel.close()


async def check_connection() -> bool:
    """Check if RabbitMQ is reachable."""
    try:
        conn = await get_connection()
        return not conn.is_closed
    except Exception:
        return False


async def close_connection():
    global _connection
    if _connection and not _connection.is_closed:
        await _connection.close()
        _connection = None
