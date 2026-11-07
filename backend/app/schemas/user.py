import enum
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserRole(str, enum.Enum):
    admin = "admin"
    manager = "manager"
    supervisor = "supervisor"
    operator = "operator"


class UserSchema(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreateRequest(BaseModel):
    email: EmailStr
    name: str
    role: UserRole
    password: str


class UserUpdateRequest(BaseModel):
    name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
