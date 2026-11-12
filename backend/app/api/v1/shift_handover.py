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
    from app.services.llm_caller import ask_claude

    dump = body.model_dump()
    summary_prompt = (
        f"You are a manufacturing AI assistant. Write a concise shift handover summary (3-4 sentences) "
        f"based on this shift data for a supervisor reading it next shift.\n\n"
        f"Shift: {dump.get('shift_name', 'unknown')} on {dump.get('shift_date', 'today')}\n"
        f"Production: {dump.get('production_actual', 0)}/{dump.get('production_target', 0)} units, "
        f"OEE: {dump.get('oee_pct', 0)}%, FPY: {dump.get('fpy_pct', 0)}%\n"
        f"Downtime: {dump.get('downtime_minutes', 0)} min, Open NCRs: {dump.get('open_ncrs', 0)}\n"
        f"Issues: {len(dump.get('issues', []))} reported\n"
        f"Notes: {dump.get('notes', 'none')}\n\n"
        f"Keep it factual and actionable. Flag anything requiring immediate attention."
    )
    ai_summary = await ask_claude(summary_prompt, db, current_user.organization_id, max_tokens=200)
    if not dump.get("notes"):
        dump["notes"] = f"[AI Summary] {ai_summary}"
    elif ai_summary and "AI commentary unavailable" not in ai_summary:
        dump["notes"] = dump["notes"] + f"\n\n[AI Summary] {ai_summary}"

    report = ShiftHandoverReport(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        submitted_by=current_user.id,
        **dump,
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
