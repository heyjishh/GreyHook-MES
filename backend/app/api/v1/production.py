import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.core.database import get_db
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.models.factory import ProductionLine
from app.models.production import ProductionOrder
from app.models.shift import Shift
from app.models.user import User
from app.schemas.production import (
    CurrentProductionSchema,
    ProductionOrderCreateRequest,
    ProductionOrderSchema,
    ProductionOrderStatus,
    ProductionSummarySchema,
)
from app.schemas.user import UserRole

router = APIRouter()

ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    "scheduled": ["running", "cancelled"],
    "running": ["paused", "completed"],
    "paused": ["running"],
    "completed": [],
    "cancelled": [],
}


@router.get("/lines/{line_id}/production/current")
async def get_current_production(
    line_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
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

    result = await db.execute(
        select(ProductionOrder).where(
            ProductionOrder.line_id == line_id,
            ProductionOrder.organization_id == current_user.organization_id,
            ProductionOrder.status == "running",
        ).limit(1)
    )
    order = result.scalar_one_or_none()
    if order is None:
        return Response(status_code=204)

    now = datetime.now(UTC)
    shift_start = order.actual_start or order.planned_start
    shift_end = order.planned_end
    total_duration = (shift_end - shift_start).total_seconds()
    elapsed = (now - shift_start).total_seconds()
    elapsed_pct = min(elapsed / total_duration, 1.0) if total_duration > 0 else 0.0
    completion_pct = order.actual_qty / order.planned_qty if order.planned_qty > 0 else 0.0

    estimated_completion_at = None
    if order.actual_qty > 0 and elapsed > 0:
        rate = order.actual_qty / elapsed
        remaining = order.planned_qty - order.actual_qty
        if rate > 0:
            from datetime import timedelta
            estimated_completion_at = now + timedelta(seconds=remaining / rate)

    return CurrentProductionSchema(
        order_id=order.id,
        order_number=order.order_number,
        product_code=order.product_code,
        planned_qty=order.planned_qty,
        actual_qty=order.actual_qty,
        rejected_qty=order.rejected_qty,
        shift_start=shift_start,
        shift_end=shift_end,
        elapsed_pct=elapsed_pct,
        completion_pct=completion_pct,
        estimated_completion_at=estimated_completion_at,
    )


@router.get("/lines/{line_id}/production/history", response_model=dict)
async def get_production_history(
    line_id: uuid.UUID,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    granularity: str = "shift",
    current_user: User = Depends(get_current_user),
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

    stmt = select(ProductionOrder).where(
        ProductionOrder.line_id == line_id,
        ProductionOrder.organization_id == current_user.organization_id,
        ProductionOrder.status.in_(["completed", "cancelled"]),
    )
    if from_time is not None:
        stmt = stmt.where(ProductionOrder.planned_start >= from_time)
    if to_time is not None:
        stmt = stmt.where(ProductionOrder.planned_end <= to_time)
    stmt = stmt.order_by(ProductionOrder.planned_start.desc())

    result = await db.execute(stmt)
    orders = result.scalars().all()

    items = [
        ProductionSummarySchema(
            order_id=o.id,
            order_number=o.order_number,
            product_code=o.product_code,
            shift_id=o.shift_id,
            planned_qty=o.planned_qty,
            actual_qty=o.actual_qty,
            good_qty=o.actual_qty - o.rejected_qty,
            rejected_qty=o.rejected_qty,
            status=o.status,
            planned_start=o.planned_start,
            planned_end=o.planned_end,
        )
        for o in orders
    ]
    return {"items": items}


@router.get("/lines/{line_id}/production/orders", response_model=dict)
async def list_production_orders(
    line_id: uuid.UUID,
    status: str | None = None,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
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

    stmt = select(ProductionOrder).where(
        ProductionOrder.line_id == line_id,
        ProductionOrder.organization_id == current_user.organization_id,
    )
    if status is not None:
        stmt = stmt.where(ProductionOrder.status == status)
    if from_time is not None:
        stmt = stmt.where(ProductionOrder.planned_start >= from_time)
    if to_time is not None:
        stmt = stmt.where(ProductionOrder.planned_end <= to_time)
    stmt = stmt.order_by(ProductionOrder.planned_start.desc()).limit(limit)

    result = await db.execute(stmt)
    orders = result.scalars().all()
    return {
        "items": [ProductionOrderSchema.model_validate(o) for o in orders],
        "total": len(orders),
        "next_cursor": None,
    }


@router.post("/lines/{line_id}/production/orders", response_model=ProductionOrderSchema, status_code=201)
async def create_production_order(
    line_id: uuid.UUID,
    body: ProductionOrderCreateRequest,
    current_user: User = Depends(require_role(UserRole.supervisor, UserRole.admin, UserRole.manager)),
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

    if body.planned_qty < 1:
        raise ValidationError("planned_qty must be at least 1")
    if body.planned_end <= body.planned_start:
        raise ValidationError("planned_end must be after planned_start")

    running_result = await db.execute(
        select(ProductionOrder).where(
            ProductionOrder.line_id == line_id,
            ProductionOrder.organization_id == current_user.organization_id,
            ProductionOrder.status == "running",
        )
    )
    if running_result.scalar_one_or_none() is not None:
        raise ConflictError("Another order is already running on this line")

    order = ProductionOrder(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        line_id=line_id,
        shift_id=body.shift_id,
        product_id=body.product_id,
        order_number=body.order_number,
        product_code=body.product_code,
        planned_qty=body.planned_qty,
        status="scheduled",
        planned_start=body.planned_start,
        planned_end=body.planned_end,
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return ProductionOrderSchema.model_validate(order)


@router.get("/production/orders/{order_id}", response_model=ProductionOrderSchema)
async def get_production_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.organization_id == current_user.organization_id,
        )
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError(f"Production order {order_id} not found")
    return ProductionOrderSchema.model_validate(order)


@router.patch("/production/orders/{order_id}", response_model=ProductionOrderSchema)
async def update_production_order(
    order_id: uuid.UUID,
    body: dict,
    current_user: User = Depends(require_role(UserRole.supervisor, UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProductionOrder).where(
            ProductionOrder.id == order_id,
            ProductionOrder.organization_id == current_user.organization_id,
        )
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise NotFoundError(f"Production order {order_id} not found")

    new_status = body.get("status")
    if new_status is not None:
        allowed = ALLOWED_TRANSITIONS.get(order.status, [])
        if new_status not in allowed:
            raise ConflictError(
                f"Invalid status transition from {order.status} to {new_status}",
                extra={
                    "current_status": order.status,
                    "requested_status": new_status,
                    "allowed_transitions": allowed,
                },
            )
        order.status = new_status
        now = datetime.now(UTC)
        if new_status == "running" and order.actual_start is None:
            order.actual_start = now
        elif new_status in ("completed", "cancelled"):
            order.actual_end = now

    await db.commit()
    await db.refresh(order)
    return ProductionOrderSchema.model_validate(order)
