import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.ai import AIInvestigation
from app.models.user import User
from app.schemas.ai import (
    AIInvestigationCreateRequest,
    AIInvestigationCreateResponse,
    AIInvestigationSchema,
    AIResultSchema,
    FeedbackRequest,
)
from app.schemas.user import UserRole

router = APIRouter()

RATE_LIMIT_PER_ORG_PER_HOUR = 10


@router.post("/ai/investigations", status_code=status.HTTP_202_ACCEPTED, response_model=AIInvestigationCreateResponse)
async def create_investigation(
    body: AIInvestigationCreateRequest,
    current_user: User = Depends(require_role(UserRole.supervisor, UserRole.manager, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    one_hour_ago = datetime.now(UTC) - timedelta(hours=1)
    count_result = await db.execute(
        select(func.count()).select_from(AIInvestigation).where(
            AIInvestigation.organization_id == current_user.organization_id,
            AIInvestigation.created_at >= one_hour_ago,
        )
    )
    recent_count = count_result.scalar_one()
    if recent_count >= RATE_LIMIT_PER_ORG_PER_HOUR:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": {"code": "RATE_LIMITED", "message": "Rate limit exceeded: 10 investigations per organization per hour", "status": 429}},
        )

    investigation_id = uuid.uuid4()
    context_data = {
        "machine_id": str(body.context.machine_id) if body.context.machine_id else None,
        "from": body.context.from_time.isoformat(),
        "to": body.context.to.isoformat(),
    }

    investigation = AIInvestigation(
        id=investigation_id,
        organization_id=current_user.organization_id,
        initiated_by=current_user.id,
        question=body.question,
        context_window=context_data,
        status="pending",
        model_provider="anthropic",
        model_id="claude-sonnet-4-6",
    )
    db.add(investigation)
    await db.commit()
    await db.refresh(investigation)

    from app.core.config import get_settings as _get_settings
    from app.kafka_producer import publish

    _cfg = _get_settings()
    await publish(
        topic=_cfg.kafka_ai_request_topic,
        payload={
            "investigation_id": str(investigation_id),
            "organization_id": str(current_user.organization_id),
            "question": body.question,
            "machine_id": context_data.get("machine_id"),
            "from_time": context_data["from"],
            "to_time": context_data["to"],
            "model_id": "claude-sonnet-4-6",
            "created_at": datetime.now(UTC).isoformat(),
        },
    )

    return AIInvestigationCreateResponse(
        investigation_id=investigation_id,
        status="pending",
    )


@router.get("/ai/investigations/{investigation_id}", response_model=AIInvestigationSchema)
async def get_investigation(
    investigation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIInvestigation).where(AIInvestigation.id == investigation_id)
    )
    investigation = result.scalar_one_or_none()
    if investigation is None:
        raise NotFoundError(f"Investigation {investigation_id} not found")
    if investigation.organization_id != current_user.organization_id:
        raise ForbiddenError("Investigation belongs to a different organization")

    parsed_result: AIResultSchema | None = None
    if investigation.result is not None:
        try:
            parsed_result = AIResultSchema.model_validate(investigation.result)
        except Exception:
            parsed_result = None

    return AIInvestigationSchema(
        id=investigation.id,
        status=investigation.status,
        question=investigation.question,
        result=parsed_result,
        model_provider=investigation.model_provider,
        model_id=investigation.model_id,
        created_at=investigation.created_at,
        completed_at=investigation.completed_at,
    )


@router.post("/ai/investigations/{investigation_id}/feedback", response_model=dict)
async def submit_feedback(
    investigation_id: uuid.UUID,
    body: FeedbackRequest,
    current_user: User = Depends(require_role(UserRole.supervisor, UserRole.manager, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIInvestigation).where(AIInvestigation.id == investigation_id)
    )
    investigation = result.scalar_one_or_none()
    if investigation is None:
        raise NotFoundError(f"Investigation {investigation_id} not found")
    if investigation.organization_id != current_user.organization_id:
        raise ForbiddenError("Investigation belongs to a different organization")
    if investigation.feedback is not None:
        raise ConflictError("Feedback has already been submitted for this investigation")

    investigation.feedback = body.feedback
    investigation.feedback_comment = body.comment
    await db.commit()

    return {"ok": True}
