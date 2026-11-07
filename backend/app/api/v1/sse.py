import asyncio
import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.exceptions import NotFoundError, UnauthorizedError
from app.core.security import decode_access_token
from app.models.factory import Factory, ProductionLine
from app.models.machine import Machine
from app.models.telemetry import MachineStatePeriod

router = APIRouter()


async def _machine_status_stream(factory_id: uuid.UUID, organization_id: uuid.UUID):
    while True:
        try:
            async with AsyncSessionLocal() as db:
                lines_result = await db.execute(
                    select(ProductionLine.id).where(
                        ProductionLine.factory_id == factory_id,
                        ProductionLine.organization_id == organization_id,
                    )
                )
                line_ids = [row[0] for row in lines_result.all()]

                if line_ids:
                    machines_result = await db.execute(
                        select(Machine).where(
                            Machine.line_id.in_(line_ids),
                            Machine.organization_id == organization_id,
                            Machine.is_active == True,
                        )
                    )
                    machines = machines_result.scalars().all()

                    for machine in machines:
                        state_result = await db.execute(
                            select(MachineStatePeriod)
                            .where(
                                MachineStatePeriod.machine_id == machine.id,
                                MachineStatePeriod.organization_id == organization_id,
                                MachineStatePeriod.ended_at == None,
                            )
                            .order_by(MachineStatePeriod.started_at.desc())
                            .limit(1)
                        )
                        period = state_result.scalar_one_or_none()

                        event_data = {
                            "machine_id": str(machine.id),
                            "state": period.state if period else "offline",
                            "timestamp": datetime.now(UTC).isoformat(),
                            "factory_id": str(factory_id),
                        }
                        yield f"data: {json.dumps(event_data)}\n\n"

        except Exception:
            yield ": keepalive\n\n"

        await asyncio.sleep(5)

        yield ": keepalive\n\n"


@router.get("/machines/{factory_id}/status")
async def sse_machines_status(
    factory_id: uuid.UUID,
    token: str = Query(...),
):
    payload = decode_access_token(token)
    org_id_str = payload.get("org")
    if org_id_str is None:
        raise UnauthorizedError("Token missing organization claim")

    organization_id = uuid.UUID(org_id_str)

    async with AsyncSessionLocal() as db:
        factory_result = await db.execute(
            select(Factory).where(
                Factory.id == factory_id,
                Factory.organization_id == organization_id,
            )
        )
        if factory_result.scalar_one_or_none() is None:
            raise NotFoundError(f"Factory {factory_id} not found")

    return StreamingResponse(
        _machine_status_stream(factory_id, organization_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
