import asyncio
import json
from datetime import UTC, datetime

import structlog
from kafka import KafkaConsumer

from app.config import Settings
from app.db_retriever import fetch_investigation_context
from app.pipeline import InvestigationPipeline
from app.producer import make_producer
from app.schemas import EvidenceSnippet, InvestigationRequest, InvestigationResult

logger = structlog.get_logger(__name__)


def _build_result(
    request: InvestigationRequest,
    status: str,
    answer: str | None = None,
    tokens_used: int = 0,
    error_message: str | None = None,
    documents=None,
) -> dict:
    snippets: list[EvidenceSnippet] = []
    if documents:
        for doc in documents[:5]:
            snippets.append(EvidenceSnippet(
                content=doc.content[:300],
                source=doc.meta.get("source", "data"),
            ))
    result = InvestigationResult(
        investigation_id=request.investigation_id,
        organization_id=request.organization_id,
        status=status,
        answer=answer,
        evidence_snippets=snippets,
        error_message=error_message,
        tokens_used=tokens_used,
        completed_at=datetime.now(UTC).isoformat(),
    )
    return result.model_dump(mode="json")


def run_consumer(settings: Settings) -> None:
    pipeline = InvestigationPipeline(anthropic_api_key=settings.anthropic_api_key)
    producer = make_producer(settings.kafka_bootstrap_servers)
    logger.info("ai_service_starting", topic=settings.kafka_request_topic)

    consumer = KafkaConsumer(
        settings.kafka_request_topic,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=settings.kafka_consumer_group,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        session_timeout_ms=30000,
        heartbeat_interval_ms=10000,
    )

    for msg in consumer:
        raw = msg.value
        log = logger.bind(investigation_id=raw.get("investigation_id", "?"))
        log.info("investigation_received")
        documents = []
        try:
            request = InvestigationRequest(**raw)
            documents = asyncio.run(
                fetch_investigation_context(
                    postgres_dsn=settings.postgres_dsn,
                    machine_id=request.machine_id,
                    from_time_str=request.from_time,
                    to_time_str=request.to_time,
                )
            )
            pipeline_result = pipeline.run(question=request.question, documents=documents)
            result = _build_result(
                request=request,
                status="completed",
                answer=pipeline_result["answer"],
                tokens_used=pipeline_result["tokens_used"],
                documents=documents,
            )
            log.info("investigation_completed", tokens=pipeline_result["tokens_used"])
        except Exception as exc:
            log.error("investigation_failed", error=str(exc))
            try:
                request_obj = InvestigationRequest(**raw)
                failed_result = _build_result(
                    request=request_obj,
                    status="failed",
                    error_message=str(exc),
                )
                producer.send(settings.kafka_result_topic, value=failed_result)
            except Exception:
                pass
            continue

        producer.send(settings.kafka_result_topic, value=result)
