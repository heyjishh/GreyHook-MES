import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.shift_handover import ShiftHandoverReport
from app.models.user import User
from app.schemas.shift_handover import ShiftHandoverCreate, ShiftHandoverSchema, ShiftHandoverUpdate
from app.schemas.user import UserRole

router = APIRouter()


@router.get("/shift-handovers", response_model=list[ShiftHandoverSchema])
async def list_handovers(
    limit: int = Query(20, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShiftHandoverReport)
        .where(ShiftHandoverReport.organization_id == current_user.organization_id)
        .order_by(ShiftHandoverReport.shift_date.desc(), ShiftHandoverReport.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [ShiftHandoverSchema.model_validate(r) for r in result.scalars().all()]


@router.post("/shift-handovers", response_model=ShiftHandoverSchema, status_code=status.HTTP_201_CREATED)
async def create_handover(
    body: ShiftHandoverCreate,
    current_user: User = Depends(require_role(UserRole.supervisor, UserRole.manager, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    report = ShiftHandoverReport(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        submitted_by=current_user.id,
        **body.model_dump(),
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return ShiftHandoverSchema.model_validate(report)


@router.patch("/shift-handovers/{report_id}", response_model=ShiftHandoverSchema)
async def update_handover(
    report_id: uuid.UUID,
    body: ShiftHandoverUpdate,
    current_user: User = Depends(require_role(UserRole.supervisor, UserRole.manager, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ShiftHandoverReport).where(ShiftHandoverReport.id == report_id)
    )
    report = result.scalar_one_or_none()
    if report is None:
        raise NotFoundError(f"Handover report {report_id} not found")
    if report.organization_id != current_user.organization_id:
        raise ForbiddenError("Report belongs to a different organization")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(report, field, value)
    await db.commit()
    await db.refresh(report)
    return ShiftHandoverSchema.model_validate(report)
