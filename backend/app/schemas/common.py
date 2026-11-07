from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int


class ApiErrorDetail(BaseModel):
    code: str
    message: str
    status: int


class ApiErrorResponse(BaseModel):
    error: ApiErrorDetail
