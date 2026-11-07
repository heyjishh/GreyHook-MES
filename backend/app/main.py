import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1 import router as v1_router
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.core.exceptions import GreyHookException, greyhook_exception_handler
from app.core.audit import audit_middleware
from app.core.logging import bind_request_context, configure_logging, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger = get_logger(__name__)

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        logger.info("database_connection_ok")
    except Exception as exc:
        logger.error("database_connection_failed", error=str(exc))

    yield


app = FastAPI(
    title="GreyHook MES API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()

_cors_origins: list[str] = (
    settings.cors_origins
    if settings.cors_origins
    else (["http://localhost:3000"] if settings.environment == "development" else [])
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    bind_request_context(request_id=request_id)
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


app.middleware("http")(audit_middleware)


app.add_exception_handler(GreyHookException, greyhook_exception_handler)

app.include_router(v1_router, prefix="/api/v1")
