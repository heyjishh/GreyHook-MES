import enum
import uuid
from datetime import datetime

from pydantic import BaseModel


class ProductionOrderStatus(str, enum.Enum):
    scheduled = "scheduled"
    running = "running"
    paused = "paused"
    completed = "completed"
    cancelled = "cancelled"


class ProductionOrderSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    line_id: uuid.UUID
    shift_id: uuid.UUID | None
    order_number: str
    product_code: str
    product_id: uuid.UUID | None
    planned_qty: int
    actual_qty: int
    rejected_qty: int
    status: ProductionOrderStatus
    planned_start: datetime
    planned_end: datetime
    actual_start: datetime | None
    actual_end: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductionOrderCreateRequest(BaseModel):
    order_number: str
    product_code: str
    product_id: uuid.UUID | None = None
    planned_qty: int
    shift_id: uuid.UUID
    planned_start: datetime
    planned_end: datetime


class CurrentProductionSchema(BaseModel):
    order_id: uuid.UUID
    order_number: str
    product_code: str
    planned_qty: int
    actual_qty: int
    rejected_qty: int
    shift_start: datetime
    shift_end: datetime
    elapsed_pct: float
    completion_pct: float
    estimated_completion_at: datetime | None


class ProductionSummarySchema(BaseModel):
    order_id: uuid.UUID
    order_number: str
    product_code: str
    shift_id: uuid.UUID | None
    planned_qty: int
    actual_qty: int
    good_qty: int
    rejected_qty: int
    status: str
    planned_start: datetime
    planned_end: datetime

    model_config = {"from_attributes": True}
