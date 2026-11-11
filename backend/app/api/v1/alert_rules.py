import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import NotFoundError
from app.models.alert_rule import AlertRule
from app.models.user import User
from app.schemas.alert_rule import AlertRuleCreate, AlertRuleSchema, AlertRuleUpdate
from app.schemas.user import UserRole

router = APIRouter()

VALID_EVENT_TYPES = {
    "machine_fault",
    "oee_below_target",
    "downtime_threshold",
    "quality_drop",
    "shift_start",
    "shift_end",
    "sync_complete",
    "erp_error",
}
VALID_CHANNEL_TYPES = {"email", "slack", "webhook"}


@router.get("/settings/alert-rules", response_model=list[AlertRuleSchema])
async def list_alert_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertRule)
        .where(AlertRule.organization_id == current_user.organization_id)
        .order_by(AlertRule.created_at)
    )
    return [AlertRuleSchema.model_validate(r) for r in result.scalars().all()]


@router.post("/settings/alert-rules", response_model=AlertRuleSchema, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    body: AlertRuleCreate,
    current_user: User = Depends(require_role(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    rule = AlertRule(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        **body.model_dump(),
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return AlertRuleSchema.model_validate(rule)


@router.patch("/settings/alert-rules/{rule_id}", response_model=AlertRuleSchema)
async def update_alert_rule(
    rule_id: uuid.UUID,
    body: AlertRuleUpdate,
    current_user: User = Depends(require_role(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.organization_id == current_user.organization_id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise NotFoundError(f"Alert rule {rule_id} not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return AlertRuleSchema.model_validate(rule)


@router.delete("/settings/alert-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(require_role(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AlertRule).where(
            AlertRule.id == rule_id,
            AlertRule.organization_id == current_user.organization_id,
        )
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise NotFoundError(f"Alert rule {rule_id} not found")
    await db.delete(rule)
    await db.commit()
