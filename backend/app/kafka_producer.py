import json

from aiokafka import AIOKafkaProducer

from app.core.config import get_settings

_producer: AIOKafkaProducer | None = None


async def start_kafka_producer() -> None:
    global _producer
    settings = get_settings()
    _producer = AIOKafkaProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    await _producer.start()


async def stop_kafka_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None


async def publish(topic: str, payload: dict) -> None:
    if _producer is None:
        raise RuntimeError("Kafka producer not started")
    await _producer.send_and_wait(topic, value=payload)
