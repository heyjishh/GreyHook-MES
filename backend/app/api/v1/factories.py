import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.factory import Factory, ProductionLine
from app.models.machine import Machine
from app.models.user import User
from app.schemas.factory import (
    FactoryCreateRequest,
    FactorySchema,
    FactoryUpdateRequest,
    ProductionLineSchema,
)
from app.schemas.machine import MachineSchema, MachineState, MachineStatusSchema
from app.schemas.user import UserRole

router = APIRouter()


@router.get("/factories", response_model=dict)
async def list_factories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Factory).where(Factory.organization_id == current_user.organization_id)
    )
    factories = result.scalars().all()
    return {
        "items": [FactorySchema.model_validate(f) for f in factories],
        "total": len(factories),
    }


@router.get("/factories/{factory_id}", response_model=FactorySchema)
async def get_factory(
    factory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Factory).where(Factory.id == factory_id))
    factory = result.scalar_one_or_none()
    if factory is None:
        raise NotFoundError(f"Factory {factory_id} not found")
    if factory.organization_id != current_user.organization_id:
        raise NotFoundError(f"Factory {factory_id} not found")
    return FactorySchema.model_validate(factory)


@router.post("/factories", response_model=FactorySchema, status_code=201)
async def create_factory(
    body: FactoryCreateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    factory = Factory(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        name=body.name,
        location=body.location,
    )
    db.add(factory)
    await db.commit()
    await db.refresh(factory)
    return FactorySchema.model_validate(factory)


@router.put("/factories/{factory_id}", response_model=FactorySchema)
async def update_factory(
    factory_id: uuid.UUID,
    body: FactoryUpdateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Factory).where(
            Factory.id == factory_id,
            Factory.organization_id == current_user.organization_id,
        )
    )
    factory = result.scalar_one_or_none()
    if factory is None:
        raise NotFoundError(f"Factory {factory_id} not found")

    factory.name = body.name
    factory.location = body.location
    await db.commit()
    await db.refresh(factory)
    return FactorySchema.model_validate(factory)


@router.get("/factories/{factory_id}/lines", response_model=dict)
async def list_lines(
    factory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    factory_result = await db.execute(
        select(Factory).where(
            Factory.id == factory_id,
            Factory.organization_id == current_user.organization_id,
        )
    )
    if factory_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Factory {factory_id} not found")

    result = await db.execute(
        select(ProductionLine).where(
            ProductionLine.factory_id == factory_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    lines = result.scalars().all()
    return {
        "items": [ProductionLineSchema.model_validate(l) for l in lines],
        "total": len(lines),
    }


@router.get("/factories/{factory_id}/machines", response_model=dict)
async def list_factory_machines(
    factory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    factory_result = await db.execute(
        select(Factory).where(
            Factory.id == factory_id,
            Factory.organization_id == current_user.organization_id,
        )
    )
    if factory_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Factory {factory_id} not found")

    lines_result = await db.execute(
        select(ProductionLine.id).where(
            ProductionLine.factory_id == factory_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    line_ids = [row[0] for row in lines_result.all()]

    if not line_ids:
        return {"items": [], "total": 0}

    result = await db.execute(
        select(Machine).where(
            Machine.line_id.in_(line_ids),
            Machine.organization_id == current_user.organization_id,
        )
    )
    machines = result.scalars().all()
    return {
        "items": [MachineSchema.model_validate(m) for m in machines],
        "total": len(machines),
    }


@router.get("/factories/{factory_id}/machines/status", response_model=dict)
async def factory_machines_status(
    factory_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    factory_result = await db.execute(
        select(Factory).where(
            Factory.id == factory_id,
            Factory.organization_id == current_user.organization_id,
        )
    )
    if factory_result.scalar_one_or_none() is None:
        raise NotFoundError(f"Factory {factory_id} not found")

    lines_result = await db.execute(
        select(ProductionLine.id).where(
            ProductionLine.factory_id == factory_id,
            ProductionLine.organization_id == current_user.organization_id,
        )
    )
    line_ids = [row[0] for row in lines_result.all()]

    if not line_ids:
        return {"items": [], "as_of": datetime.now(UTC).isoformat()}

    result = await db.execute(
        select(Machine).where(
            Machine.line_id.in_(line_ids),
            Machine.organization_id == current_user.organization_id,
            Machine.is_active == True,
        )
    )
    machines = result.scalars().all()

    statuses = []
    for m in machines:
        statuses.append(
            MachineStatusSchema(
                machine_id=m.id,
                name=m.name,
                line_id=m.line_id,
                current_state=MachineState.offline,
                state_since=m.created_at,
                last_event_at=None,
            )
        )

    return {"items": statuses, "as_of": datetime.now(UTC).isoformat()}
