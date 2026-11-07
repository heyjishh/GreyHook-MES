import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ConflictError, NotFoundError
from app.models.factory import Factory
from app.models.production import ProductionOrder
from app.models.shift import Shift
from app.models.user import User
from app.schemas.shift import ShiftCreateRequest, ShiftSchema, ShiftUpdateRequest
from app.schemas.user import UserRole

router = APIRouter()


def _compute_planned_time(shift: Shift) -> int:
    start = shift.start_time
    end = shift.end_time
    start_minutes = start.hour * 60 + start.minute
    end_minutes = end.hour * 60 + end.minute
    if end_minutes <= start_minutes:
        end_minutes += 1440
    duration = end_minutes - start_minutes
    planned_stops_minutes = sum(s.get("duration_minutes", 0) for s in (shift.planned_stops or []))
    return duration - planned_stops_minutes


def _to_schema(shift: Shift) -> ShiftSchema:
    from app.schemas.shift import PlannedStop
    planned_stops = [
        PlannedStop(**s) if isinstance(s, dict) else s
        for s in (shift.planned_stops or [])
    ]
    return ShiftSchema(
        id=shift.id,
        organization_id=shift.organization_id,
        factory_id=shift.factory_id,
        name=shift.name,
        start_time=shift.start_time,
        end_time=shift.end_time,
        days_of_week=shift.days_of_week,
        planned_stops=planned_stops,
        planned_production_time_minutes=_compute_planned_time(shift),
        is_active=shift.is_active,
    )


@router.get("/factories/{factory_id}/shifts", response_model=dict)
async def list_shifts(
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
        select(Shift).where(
            Shift.factory_id == factory_id,
            Shift.organization_id == current_user.organization_id,
            Shift.is_active == True,
        )
    )
    shifts = result.scalars().all()
    return {"items": [_to_schema(s) for s in shifts], "total": len(shifts)}


@router.post("/factories/{factory_id}/shifts", response_model=ShiftSchema, status_code=201)
async def create_shift(
    factory_id: uuid.UUID,
    body: ShiftCreateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
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

    if not body.days_of_week:
        from app.core.exceptions import ValidationError
        raise ValidationError("days_of_week must not be empty")

    shift = Shift(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        factory_id=factory_id,
        name=body.name,
        start_time=body.start_time,
        end_time=body.end_time,
        days_of_week=body.days_of_week,
        planned_stops=[s.model_dump() for s in body.planned_stops],
    )
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return _to_schema(shift)


@router.put("/shifts/{shift_id}", response_model=ShiftSchema)
async def update_shift(
    shift_id: uuid.UUID,
    body: ShiftUpdateRequest,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Shift).where(
            Shift.id == shift_id,
            Shift.organization_id == current_user.organization_id,
        )
    )
    shift = result.scalar_one_or_none()
    if shift is None:
        raise NotFoundError(f"Shift {shift_id} not found")

    shift.name = body.name
    shift.start_time = body.start_time
    shift.end_time = body.end_time
    shift.days_of_week = body.days_of_week
    shift.planned_stops = [s.model_dump() for s in body.planned_stops]
    await db.commit()
    await db.refresh(shift)
    return _to_schema(shift)


@router.delete("/shifts/{shift_id}")
async def delete_shift(
    shift_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Shift).where(
            Shift.id == shift_id,
            Shift.organization_id == current_user.organization_id,
        )
    )
    shift = result.scalar_one_or_none()
    if shift is None:
        raise NotFoundError(f"Shift {shift_id} not found")

    orders_result = await db.execute(
        select(ProductionOrder.id).where(
            ProductionOrder.shift_id == shift_id,
            ProductionOrder.organization_id == current_user.organization_id,
        ).limit(10)
    )
    referenced = [str(row[0]) for row in orders_result.all()]
    if referenced:
        shift.is_active = False
        await db.commit()
        raise ConflictError(
            "Shift is referenced by production orders and was deactivated",
            extra={"referenced_by": referenced},
        )

    shift.is_active = False
    await db.commit()
    return {"ok": True}
