"""Kafka → OpenSearch indexer for GreyHook MES events."""
import json
import os
import time
import uuid

import structlog
from kafka import KafkaConsumer
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.helpers import bulk

logger = structlog.get_logger()

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
OPENSEARCH_URL = os.environ.get("OPENSEARCH_URL", "http://localhost:9200")
CONSUMER_GROUP = os.environ.get("CONSUMER_GROUP_ID", "opensearch-indexer")

TOPICS = [
    "mes.telemetry.normalized",
    "mes.downtime.events",
    "mes.production.events",
    "ai.investigation.completed",
]

INDEX_MAP = {
    "mes.telemetry.normalized": "mes-telemetry",
    "mes.downtime.events": "mes-downtime",
    "mes.production.events": "mes-production",
    "ai.investigation.completed": "mes-investigations",
}

INDEX_MAPPINGS = {
    "mes-telemetry": {
        "mappings": {
            "properties": {
                "machine_id": {"type": "keyword"},
                "organization_id": {"type": "keyword"},
                "timestamp": {"type": "date"},
                "state": {"type": "keyword"},
                "value": {"type": "float"},
                "metric": {"type": "keyword"},
            }
        }
    },
    "mes-downtime": {
        "mappings": {
            "properties": {
                "machine_id": {"type": "keyword"},
                "organization_id": {"type": "keyword"},
                "category": {"type": "keyword"},
                "reason": {"type": "text", "fields": {"keyword": {"type": "keyword"}}},
                "started_at": {"type": "date"},
                "ended_at": {"type": "date"},
                "duration_seconds": {"type": "integer"},
                "is_planned": {"type": "boolean"},
            }
        }
    },
    "mes-production": {
        "mappings": {
            "properties": {
                "order_number": {"type": "keyword"},
                "product_code": {"type": "keyword"},
                "line_id": {"type": "keyword"},
                "status": {"type": "keyword"},
                "event_type": {"type": "keyword"},
                "timestamp": {"type": "date"},
            }
        }
    },
    "mes-investigations": {
        "mappings": {
            "properties": {
                "machine_id": {"type": "keyword"},
                "organization_id": {"type": "keyword"},
                "summary": {"type": "text"},
                "root_cause": {"type": "text"},
                "recommendations": {"type": "text"},
                "severity": {"type": "keyword"},
                "completed_at": {"type": "date"},
            }
        }
    },
}


def build_opensearch_client() -> OpenSearch:
    from urllib.parse import urlparse
    parsed = urlparse(OPENSEARCH_URL)
    host = parsed.hostname or "localhost"
    port = parsed.port or 9200
    scheme = parsed.scheme or "http"
    return OpenSearch(
        hosts=[{"host": host, "port": port}],
        http_compress=True,
        use_ssl=(scheme == "https"),
        verify_certs=False,
        connection_class=RequestsHttpConnection,
    )


def ensure_indices(client: OpenSearch) -> None:
    for index_name, mapping in INDEX_MAPPINGS.items():
        if not client.indices.exists(index=index_name):
            client.indices.create(index=index_name, body=mapping)
            logger.info("index_created", index=index_name)


def wait_for_opensearch(client: OpenSearch, retries: int = 30) -> None:
    for i in range(retries):
        try:
            health = client.cluster.health(wait_for_status="yellow", timeout="10s")
            logger.info("opensearch_ready", status=health.get("status"))
            return
        except Exception as exc:
            logger.warning("opensearch_not_ready", attempt=i + 1, error=str(exc))
            time.sleep(5)
    raise RuntimeError("OpenSearch did not become ready")


def wait_for_kafka(retries: int = 30) -> KafkaConsumer:
    for i in range(retries):
        try:
            consumer = KafkaConsumer(
                *TOPICS,
                bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
                group_id=CONSUMER_GROUP,
                auto_offset_reset="latest",
                enable_auto_commit=True,
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                consumer_timeout_ms=5000,
                session_timeout_ms=30000,
                heartbeat_interval_ms=10000,
            )
            logger.info("kafka_connected", topics=TOPICS)
            return consumer
        except Exception as exc:
            logger.warning("kafka_not_ready", attempt=i + 1, error=str(exc))
            time.sleep(5)
    raise RuntimeError("Kafka did not become ready")


def message_to_doc(topic: str, msg_value: dict) -> dict:
    doc = dict(msg_value)
    if "id" not in doc:
        doc["_id"] = str(uuid.uuid4())
    else:
        doc["_id"] = str(doc.pop("id"))
    return doc


def run() -> None:
    logger.info("indexer_starting", kafka=KAFKA_BOOTSTRAP, opensearch=OPENSEARCH_URL)
    os_client = build_opensearch_client()
    wait_for_opensearch(os_client)
    ensure_indices(os_client)
    consumer = wait_for_kafka()

    buffer: list[dict] = []
    FLUSH_SIZE = 50

    logger.info("indexer_running")
    while True:
        try:
            for message in consumer:
                index_name = INDEX_MAP.get(message.topic, "mes-events")
                try:
                    doc = message_to_doc(message.topic, message.value)
                    action = {
                        "_index": index_name,
                        "_id": doc.pop("_id"),
                        "_source": doc,
                    }
                    buffer.append(action)
                    if len(buffer) >= FLUSH_SIZE:
                        success, errors = bulk(os_client, buffer, raise_on_error=False)
                        logger.info("bulk_indexed", success=success, errors=len(errors))
                        buffer.clear()
                except Exception as exc:
                    logger.error("message_processing_error", error=str(exc), topic=message.topic)

            if buffer:
                success, errors = bulk(os_client, buffer, raise_on_error=False)
                logger.info("bulk_flushed", success=success, errors=len(errors))
                buffer.clear()

        except Exception as exc:
            logger.error("consumer_error", error=str(exc))
            time.sleep(5)


if __name__ == "__main__":
    run()
