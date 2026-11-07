import uuid
from typing import Callable

from fastapi import Request, Response
from sqlalchemy import insert

from app.core.database import AsyncSessionLocal
from app.models.audit import AuditLog

_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _resource_from_path(path: str) -> tuple[str, uuid.UUID | None]:
    parts = [p for p in path.strip("/").split("/") if p]
    # /api/v1/<resource>[/<id>][/...]
    resource = parts[2] if len(parts) > 2 else "unknown"
    resource_id: uuid.UUID | None = None
    if len(parts) > 3:
        try:
            resource_id = uuid.UUID(parts[3])
        except ValueError:
            pass
    return resource, resource_id


async def audit_middleware(request: Request, call_next: Callable) -> Response:
    response = await call_next(request)

    if request.method not in _MUTATING_METHODS:
        return response
    if not request.url.path.startswith("/api/v1/"):
        return response
    if request.url.path.startswith("/api/v1/auth/"):
        return response

    try:
        user_id: uuid.UUID | None = None
        org_id: uuid.UUID | None = None

        from app.core.security import decode_access_token
        from app.core.exceptions import GreyHookException

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[len("Bearer "):]
            try:
                payload = decode_access_token(token)
                if sub := payload.get("sub"):
                    user_id = uuid.UUID(sub)
                if org := payload.get("org"):
                    org_id = uuid.UUID(org)
            except (GreyHookException, ValueError):
                pass

        resource_type, resource_id = _resource_from_path(request.url.path)
        action = f"{request.method}:{resource_type}"

        client_host = request.client.host if request.client else None

        async with AsyncSessionLocal() as db:
            await db.execute(
                insert(AuditLog).values(
                    id=uuid.uuid4(),
                    organization_id=org_id,
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    request_id=getattr(request.state, "request_id", None),
                    ip_address=client_host,
                )
            )
            await db.commit()
    except Exception:
        pass

    return response
