from fastapi import Request
from fastapi.responses import JSONResponse


class GreyHookException(Exception):
    def __init__(self, code: str, message: str, status_code: int) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(GreyHookException):
    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(code="NOT_FOUND", message=message, status_code=404)


class ForbiddenError(GreyHookException):
    def __init__(self, message: str = "Access forbidden") -> None:
        super().__init__(code="FORBIDDEN", message=message, status_code=403)


class ValidationError(GreyHookException):
    def __init__(self, message: str = "Validation error") -> None:
        super().__init__(code="VALIDATION_ERROR", message=message, status_code=422)


class ConflictError(GreyHookException):
    def __init__(self, message: str = "Conflict", extra: dict | None = None) -> None:
        super().__init__(code="CONFLICT", message=message, status_code=409)
        self.extra = extra or {}


class UnauthorizedError(GreyHookException):
    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(code="UNAUTHORIZED", message=message, status_code=401)


async def greyhook_exception_handler(request: Request, exc: GreyHookException) -> JSONResponse:
    body: dict = {
        "error": {
            "code": exc.code,
            "message": exc.message,
            "status": exc.status_code,
        }
    }
    if isinstance(exc, ConflictError) and exc.extra:
        body["error"].update(exc.extra)
    return JSONResponse(status_code=exc.status_code, content=body)
