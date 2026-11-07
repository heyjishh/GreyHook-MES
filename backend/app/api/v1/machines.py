import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.factory import ProductionLine
from app.models.machine import Machine
from app.models.telemetry import MachineEvent, MachineStatePeriod
from app.models.user import User
from app.schemas.machine import (
    MachineCreateRequest,
    MachineSchema,
    MachineState,
    MachineStatusSchema,
    MachineUpdateRequest,
)
from app.schemas.user import UserRole

router = APIRouter()


@router.get("/machines/{machine_id}/status", response_model=MachineStatusSchema)
async def get_machine_status(
    machine_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Machine).where(
            Machine.id == machine_id,
            Machine.organization_id == current_user.organization_id,
        )
    )
    machine = result.scalar_one_or_none()
    if machine is None:
        raise NotFoundError(f"Machine {machine_id} not found")

    state_result = await db.execute(
        select(MachineStatePeriod)
        .where(
            MachineStatePeriod.machine_id == machine_id,
            MachineStatePeriod.organization_id == current_user.organization_id,
            MachineStatePeriod.ended_at == None,
        )
        .order_by(MachineStatePeriod.started_at.desc())
        .limit(1)
    )
    current_period = state_result.scalar_one_or_none()

    event_result = await db.execute(
        select(MachineEvent)
        .where(
            MachineEvent.machine_id == machine_id,
            MachineEvent.organization_id == current_user.organization_id,
        )
        .order_by(MachineEvent.event_time.desc())
        .limit(1)
    )
    last_event = event_result.scalar_one_or_none()

    return MachineStatusSchema(
        machine_id=machine.id,
        name=machine.name,
        line_id=machine.line_id,
        current_state=MachineState(current_period.state) if current_period else MachineState.offline,
        state_since=current_period.started_at if current_period else machine.created_at,
        last_event_at=last_event.event_time if last_event else None,
    )


@router.get("/machines/{machine_id}/events", response_model=dict)
async def get_machine_events(
    machine_id: uuid.UUID,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    limit: int = 100,
    cursor: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    machine_result = await db.execute(
        select(Machine).where(
            Machine.id == machine_id,
            Machine.organization_id == current_user.organization_id,
        )
    )
    if machine_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Machine {machine_id} not found")

    stmt = select(MachineEvent).where(
        MachineEvent.machine_id == machine_id,
        MachineEvent.organization_id == current_user.organization_id,
    )
    if from_time is not None:
        stmt = stmt.where(MachineEvent.event_time >= from_time)
    if to_time is not None:
        stmt = stmt.where(MachineEvent.event_time <= to_time)
    stmt = stmt.order_by(MachineEvent.event_time.desc()).limit(limit)

    result = await db.execute(stmt)
    events = result.scalars().all()
    return {"items": events, "next_cursor": None}


@router.post("/lines/{line_id}/machines", response_model=MachineSchema, status_code=201)
async def create_machine(
    line_id: uuid.UUID,
    body: MachineCreateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    line_result = await db.execute(
        select(ProductionLine).where(
            ProductionLine.id == line_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    if line_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Line {line_id} not found")

    machine = Machine(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        line_id=line_id,
        name=body.name,
        machine_type=body.machine_type,
        protocol=body.protocol.value,
        asset_tag=body.asset_tag,
        endpoint_config=body.endpoint_config,
        default_product_id=body.default_product_id,
    )
    db.add(machine)
    await db.commit()
    await db.refresh(machine)
    return MachineSchema.model_validate(machine)


@router.patch("/machines/{machine_id}", response_model=MachineSchema)
async def update_machine(
    machine_id: uuid.UUID,
    body: MachineUpdateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Machine).where(
            Machine.id == machine_id,
            Machine.organization_id == current_user.organization_id,
        )
    )
    machine = result.scalar_one_or_none()
    if machine is None:
        raise NotFoundError(f"Machine {machine_id} not found")

    if body.name is not None:
        machine.name = body.name
    if body.machine_type is not None:
        machine.machine_type = body.machine_type
    if body.asset_tag is not None:
        machine.asset_tag = body.asset_tag
    if body.endpoint_config is not None:
        machine.endpoint_config = body.endpoint_config
    if body.default_product_id is not None:
        machine.default_product_id = body.default_product_id

    await db.commit()
    await db.refresh(machine)
    return MachineSchema.model_validate(machine)


@router.delete("/machines/{machine_id}")
async def delete_machine(
    machine_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Machine).where(
            Machine.id == machine_id,
            Machine.organization_id == current_user.organization_id,
        )
    )
    machine = result.scalar_one_or_none()
    if machine is None:
        raise NotFoundError(f"Machine {machine_id} not found")

    machine.is_active = False
    await db.commit()
    return {
        "ok": True,
        "deactivated": True,
        "note": "Machine has production records. Deactivated rather than deleted.",
    }
