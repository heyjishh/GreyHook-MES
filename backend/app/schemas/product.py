import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class ProductDefinitionSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    product_code: str
    name: str
    ideal_cycle_time_seconds: float
    unit: str
    is_active: bool

    model_config = {"from_attributes": True}


class ProductDefinitionCreateRequest(BaseModel):
    product_code: str
    name: str
    ideal_cycle_time_seconds: float
    unit: str = "piece"

    @field_validator("ideal_cycle_time_seconds")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("ideal_cycle_time_seconds must be greater than 0")
        return v


class ProductDefinitionUpdateRequest(BaseModel):
    name: str | None = None
    ideal_cycle_time_seconds: float | None = None
    unit: str | None = None
    is_active: bool | None = None

    @field_validator("ideal_cycle_time_seconds")
    @classmethod
    def must_be_positive(cls, v: float | None) -> float | None:
        if v is not None and v <= 0:
            raise ValueError("ideal_cycle_time_seconds must be greater than 0")
        return v
