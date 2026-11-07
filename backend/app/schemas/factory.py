import uuid
from datetime import datetime

from pydantic import BaseModel


class FactorySchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    location: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FactoryCreateRequest(BaseModel):
    name: str
    location: str | None = None


class FactoryUpdateRequest(BaseModel):
    name: str
    location: str | None = None


class ProductionLineSchema(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    factory_id: uuid.UUID
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductionLineCreateRequest(BaseModel):
    factory_id: uuid.UUID
    name: str
