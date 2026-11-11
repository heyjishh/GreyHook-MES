import json
from datetime import UTC, datetime

import structlog
from aiokafka import AIOKafkaConsumer
from sqlalchemy import update

from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.models.ai import AIInvestigation

logger = structlog.get_logger(__name__)


async def run_ai_result_worker() -> None:
    settings = get_settings()
    consumer = AIOKafkaConsumer(
        settings.kafka_ai_result_topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id="backend-ai-results",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
    )
    await consumer.start()
    logger.info("ai_result_worker_started", topic=settings.kafka_ai_result_topic)
    try:
        async for msg in consumer:
            await _handle_result(msg.value)
    finally:
        await consumer.stop()


async def _handle_result(data: dict) -> None:
    investigation_id = data.get("investigation_id")
    if not investigation_id:
        return
    status = data.get("status", "failed")
    result_payload = None
    if status == "completed":
        result_payload = {
            "answer": data.get("answer"),
            "evidence_snippets": data.get("evidence_snippets", []),
            "tokens_used": data.get("tokens_used", 0),
        }
    async with AsyncSessionLocal() as session:
        await session.execute(
            update(AIInvestigation)
            .where(AIInvestigation.id == investigation_id)
            .values(
                status=status,
                result=result_payload,
                evidence={"snippets": data.get("evidence_snippets", [])},
                completed_at=datetime.now(UTC),
                model_id=data.get("model_id", "claude-sonnet-4-6"),
                model_provider="anthropic",
            )
        )
        await session.commit()
    logger.info("investigation_result_stored", investigation_id=investigation_id, status=status)
