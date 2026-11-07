from datetime import UTC, datetime

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.database import AsyncSessionLocal
from app.core.config import get_settings

router = APIRouter()


@router.get("/health")
async def liveness():
    return {
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/health/ready")
async def readiness():
    settings = get_settings()
    checks: dict[str, str] = {
        "database": "unreachable",
        "kafka": "unreachable",
        "valkey": "unreachable",
    }

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        pass

    try:
        from aiokafka import AIOKafkaProducer
        producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
        )
        await producer.start()
        await producer.stop()
        checks["kafka"] = "ok"
    except Exception:
        pass

    try:
        import redis.asyncio as aioredis
        client = aioredis.from_url(settings.valkey_url, socket_timeout=2)
        await client.ping()
        await client.aclose()
        checks["valkey"] = "ok"
    except Exception:
        pass

    all_ok = all(v == "ok" for v in checks.values())
    status_code = 200 if all_ok else 503
    body = {
        "status": "ready" if all_ok else "not_ready",
        "checks": checks,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    return JSONResponse(status_code=status_code, content=body)
