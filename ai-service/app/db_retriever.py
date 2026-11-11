import asyncio

import asyncpg
import structlog
from haystack import Document

logger = structlog.get_logger(__name__)


async def fetch_investigation_context(
    postgres_dsn: str,
    machine_id: str | None,
    from_time_str: str,
    to_time_str: str,
) -> list[Document]:
    try:
        conn = await asyncpg.connect(postgres_dsn)
        try:
            return await _fetch_documents(conn, machine_id, from_time_str, to_time_str)
        finally:
            await conn.close()
    except Exception as exc:
        logger.warning("db_retrieval_failed", error=str(exc))
        return []


async def _fetch_documents(
    conn: asyncpg.Connection,
    machine_id: str | None,
    from_time_str: str,
    to_time_str: str,
) -> list[Document]:
    documents: list[Document] = []

    try:
        if machine_id:
            rows = await conn.fetch(
                "SELECT machine_id, timestamp, availability, performance, quality, oee "
                "FROM oee_snapshots WHERE timestamp BETWEEN $1 AND $2 AND machine_id = $3 "
                "ORDER BY timestamp DESC LIMIT 50",
                from_time_str, to_time_str, machine_id,
            )
        else:
            rows = await conn.fetch(
                "SELECT machine_id, timestamp, availability, performance, quality, oee "
                "FROM oee_snapshots WHERE timestamp BETWEEN $1 AND $2 "
                "ORDER BY timestamp DESC LIMIT 50",
                from_time_str, to_time_str,
            )
        for row in rows:
            content = (
                f"OEE snapshot | machine={row['machine_id']} | time={row['timestamp']} | "
                f"availability={row['availability']:.1%} performance={row['performance']:.1%} "
                f"quality={row['quality']:.1%} oee={row['oee']:.1%}"
            )
            documents.append(Document(content=content, meta={"source": "oee"}))
    except Exception:
        pass

    try:
        if machine_id:
            rows = await conn.fetch(
                "SELECT machine_id, started_at, ended_at, reason, duration_minutes "
                "FROM downtime_events WHERE started_at BETWEEN $1 AND $2 AND machine_id = $3 "
                "ORDER BY started_at DESC LIMIT 30",
                from_time_str, to_time_str, machine_id,
            )
        else:
            rows = await conn.fetch(
                "SELECT machine_id, started_at, ended_at, reason, duration_minutes "
                "FROM downtime_events WHERE started_at BETWEEN $1 AND $2 "
                "ORDER BY started_at DESC LIMIT 30",
                from_time_str, to_time_str,
            )
        for row in rows:
            content = (
                f"Downtime event | machine={row['machine_id']} | "
                f"start={row['started_at']} end={row['ended_at']} | "
                f"reason={row['reason']} | duration={row['duration_minutes']}min"
            )
            documents.append(Document(content=content, meta={"source": "downtime"}))
    except Exception:
        pass

    return documents
