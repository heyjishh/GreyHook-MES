from __future__ import annotations

import json
import uuid
from datetime import datetime, UTC
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.integrations.base import ConnectorConfig
from app.integrations.connectors.sap.mm import SAPMMConnector
from app.integrations.registry import available_modules, build_all_connectors, build_connector, MODULE_METADATA
from app.models.integration import (
    ERPMaterial,
    ERPProductionOrder,
    IntegrationConnector,
    IntegrationSyncLog,
)
from app.models.user import User
from pydantic import BaseModel
from app.schemas.integration import (
    ConnectivityTestResult,
    ConnectorCreate,
    ConnectorHealthOut,
    ConnectorOut,
    ConnectorUpdate,
    ERPMaterialOut,
    ERPProductionOrderOut,
    ModuleHealth,
    SyncLogOut,
    SyncRequest,
)


class BOMPushRequest(BaseModel):
    bom_records: list[dict]

router = APIRouter(prefix="/integrations", tags=["integrations"])


def _decrypt_credentials(encrypted: str) -> tuple[str, str]:
    try:
        data = json.loads(encrypted)
        return data["username"], data["password"]
    except Exception:
        return "", ""


def _encrypt_credentials(username: str, password: str) -> str:
    return json.dumps({"username": username, "password": password})


def _build_config(connector: IntegrationConnector) -> ConnectorConfig:
    username, password = _decrypt_credentials(connector.credentials_encrypted)
    return ConnectorConfig(
        system_type=connector.system_type,
        base_url=connector.base_url,
        auth_type=connector.auth_type,
        username=username,
        password=password,
        sap_client=connector.sap_client,
        sap_plant=connector.sap_plant,
        oracle_org_id=connector.oracle_org_id,
    )


@router.get("/modules", response_model=dict[str, list[dict]])
async def list_available_modules():
    result: dict[str, list[dict]] = {
        "sap": [
            {"id": mid, **meta}
            for mid, meta in MODULE_METADATA.items()
            if meta["system"] == "SAP"
        ],
        "oracle": [
            {"id": mid, **meta}
            for mid, meta in MODULE_METADATA.items()
            if meta["system"] == "Oracle"
        ],
    }
    return result


@router.get("", response_model=list[ConnectorOut])
async def list_connectors(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(IntegrationConnector)
        .where(IntegrationConnector.organization_id == current_user.organization_id)
        .order_by(IntegrationConnector.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=ConnectorOut, status_code=status.HTTP_201_CREATED)
async def create_connector(
    body: ConnectorCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "supervisor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or supervisor required")

    connector = IntegrationConnector(
        organization_id=current_user.organization_id,
        factory_id=body.factory_id,
        name=body.name,
        system_type=body.system_type,
        base_url=body.base_url,
        auth_type=body.auth_type,
        credentials_encrypted=_encrypt_credentials(body.username, body.password),
        enabled_modules=body.enabled_modules,
        sap_client=body.sap_client,
        sap_plant=body.sap_plant,
        oracle_org_id=body.oracle_org_id,
        sync_interval_minutes=body.sync_interval_minutes,
    )
    db.add(connector)
    await db.commit()
    await db.refresh(connector)
    return connector


@router.get("/{connector_id}", response_model=ConnectorOut)
async def get_connector(
    connector_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(IntegrationConnector).where(
            IntegrationConnector.id == connector_id,
            IntegrationConnector.organization_id == current_user.organization_id,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    return connector


@router.patch("/{connector_id}", response_model=ConnectorOut)
async def update_connector(
    connector_id: uuid.UUID,
    body: ConnectorUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "supervisor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or supervisor required")

    result = await db.execute(
        select(IntegrationConnector).where(
            IntegrationConnector.id == connector_id,
            IntegrationConnector.organization_id == current_user.organization_id,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(connector, field, value)
    await db.commit()
    await db.refresh(connector)
    return connector


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connector(
    connector_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")

    result = await db.execute(
        select(IntegrationConnector).where(
            IntegrationConnector.id == connector_id,
            IntegrationConnector.organization_id == current_user.organization_id,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    await db.delete(connector)
    await db.commit()


@router.post("/{connector_id}/test", response_model=ConnectivityTestResult)
async def test_connector(
    connector_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(IntegrationConnector).where(
            IntegrationConnector.id == connector_id,
            IntegrationConnector.organization_id == current_user.organization_id,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    config = _build_config(connector)
    modules = connector.enabled_modules or available_modules(connector.system_type)
    if not modules:
        raise HTTPException(status_code=400, detail="No modules enabled")

    module_id = modules[0]
    try:
        conn_obj = build_connector(connector.system_type, module_id, config)
        ok, latency_ms, message, system_info = await conn_obj.test_connection()
    except Exception as exc:
        ok, latency_ms, message, system_info = False, 0.0, str(exc), None

    connector.last_tested_at = datetime.now(UTC)
    connector.last_test_ok = ok
    await db.commit()

    return ConnectivityTestResult(ok=ok, latency_ms=latency_ms, message=message, system_info=system_info)


@router.post("/{connector_id}/sync", response_model=list[SyncLogOut])
async def trigger_sync(
    connector_id: uuid.UUID,
    body: SyncRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "supervisor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or supervisor required")

    result = await db.execute(
        select(IntegrationConnector).where(
            IntegrationConnector.id == connector_id,
            IntegrationConnector.organization_id == current_user.organization_id,
            IntegrationConnector.is_active == True,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Active connector not found")

    config = _build_config(connector)
    target_modules = body.modules or connector.enabled_modules or available_modules(connector.system_type)
    connectors = build_all_connectors(connector.system_type, target_modules, config)

    logs: list[IntegrationSyncLog] = []
    for conn_obj in connectors:
        log = IntegrationSyncLog(
            connector_id=connector.id,
            module=conn_obj.MODULE_ID,
            direction=conn_obj.DIRECTION,
            status="running",
        )
        db.add(log)
        await db.flush()

        try:
            sync_result = await conn_obj.pull(full_refresh=body.full_refresh)

            if sync_result.status == "success" and sync_result.data:
                await _persist_sync_data(db, connector, conn_obj.MODULE_ID, sync_result.data)

            log.status = sync_result.status
            log.records_fetched = sync_result.records_fetched
            log.records_written = sync_result.records_written
            log.error_count = sync_result.error_count
            log.error_detail = sync_result.error_detail
            log.finished_at = datetime.now(UTC)
        except Exception as exc:
            log.status = "error"
            log.error_count = 1
            log.error_detail = str(exc)
            log.finished_at = datetime.now(UTC)

        logs.append(log)

    await db.commit()
    for log in logs:
        await db.refresh(log)
    return logs


async def _persist_sync_data(
    db: AsyncSession,
    connector: IntegrationConnector,
    module_id: str,
    data: list[dict],
) -> None:
    if module_id == "MM" or module_id == "WMS":
        for rec in data:
            existing = await db.execute(
                select(ERPMaterial).where(
                    ERPMaterial.connector_id == connector.id,
                    ERPMaterial.material_number == rec.get("material_number", ""),
                )
            )
            obj = existing.scalar_one_or_none()
            if obj:
                for k, v in rec.items():
                    if hasattr(obj, k) and k != "id":
                        setattr(obj, k, v)
                obj.synced_at = datetime.now(UTC)
            else:
                db.add(ERPMaterial(
                    connector_id=connector.id,
                    organization_id=connector.organization_id,
                    **{k: v for k, v in rec.items() if hasattr(ERPMaterial, k) and k not in ("id",)},
                    synced_at=datetime.now(UTC),
                ))
    else:
        for rec in data:
            existing = await db.execute(
                select(ERPProductionOrder).where(
                    ERPProductionOrder.connector_id == connector.id,
                    ERPProductionOrder.erp_id == rec.get("erp_id", ""),
                )
            )
            obj = existing.scalar_one_or_none()
            safe_fields = {
                k: v for k, v in rec.items()
                if hasattr(ERPProductionOrder, k) and k not in ("id",)
            }
            if obj:
                for k, v in safe_fields.items():
                    setattr(obj, k, v)
                obj.synced_at = datetime.now(UTC)
            else:
                db.add(ERPProductionOrder(
                    connector_id=connector.id,
                    organization_id=connector.organization_id,
                    factory_id=connector.factory_id,
                    synced_at=datetime.now(UTC),
                    **safe_fields,
                ))


@router.get("/{connector_id}/orders", response_model=list[ERPProductionOrderOut])
async def list_erp_orders(
    connector_id: uuid.UUID,
    module: str | None = Query(None),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(ERPProductionOrder).where(
        ERPProductionOrder.connector_id == connector_id,
        ERPProductionOrder.organization_id == current_user.organization_id,
    )
    if module:
        q = q.where(ERPProductionOrder.module == module)
    q = q.order_by(ERPProductionOrder.synced_at.desc()).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{connector_id}/materials", response_model=list[ERPMaterialOut])
async def list_erp_materials(
    connector_id: uuid.UUID,
    limit: int = Query(200, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(ERPMaterial)
        .where(
            ERPMaterial.connector_id == connector_id,
            ERPMaterial.organization_id == current_user.organization_id,
        )
        .order_by(ERPMaterial.synced_at.desc())
        .limit(limit)
    )
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{connector_id}/logs", response_model=list[SyncLogOut])
async def list_sync_logs(
    connector_id: uuid.UUID,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = (
        select(IntegrationSyncLog)
        .where(IntegrationSyncLog.connector_id == connector_id)
        .order_by(IntegrationSyncLog.started_at.desc())
        .limit(limit)
    )
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{connector_id}/health", response_model=ConnectorHealthOut)
async def connector_health(
    connector_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(IntegrationConnector).where(
            IntegrationConnector.id == connector_id,
            IntegrationConnector.organization_id == current_user.organization_id,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")

    module_health: list[ModuleHealth] = []
    overall_errors = 0

    for module_id in (connector.enabled_modules or []):
        log_result = await db.execute(
            select(IntegrationSyncLog)
            .where(
                IntegrationSyncLog.connector_id == connector_id,
                IntegrationSyncLog.module == module_id,
            )
            .order_by(IntegrationSyncLog.started_at.desc())
            .limit(1)
        )
        last_log = log_result.scalar_one_or_none()
        meta = MODULE_METADATA.get(module_id, {})
        h = ModuleHealth(
            module=module_id,
            display_name=meta.get("display", module_id),
            direction=meta.get("direction", "erp_to_mes"),
            status=last_log.status if last_log else "success",
            last_sync=last_log.finished_at if last_log else None,
            records=last_log.records_fetched if last_log else 0,
            errors=last_log.error_count if last_log else 0,
        )
        module_health.append(h)
        overall_errors += h.errors

    overall_status = "error" if any(m.status == "error" for m in module_health) else \
                     "partial" if any(m.status == "partial" for m in module_health) else "success"

    return ConnectorHealthOut(
        connector_id=connector.id,
        connector_name=connector.name,
        system_type=connector.system_type,
        is_active=connector.is_active,
        overall_status=overall_status,
        modules=module_health,
    )


@router.post("/{connector_id}/push-bom", response_model=SyncLogOut)
async def push_bom_to_sap(
    connector_id: uuid.UUID,
    body: BOMPushRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("admin", "supervisor"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or supervisor required")

    result = await db.execute(
        select(IntegrationConnector).where(
            IntegrationConnector.id == connector_id,
            IntegrationConnector.organization_id == current_user.organization_id,
            IntegrationConnector.system_type == "SAP",
            IntegrationConnector.is_active == True,
        )
    )
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=404, detail="Active SAP connector not found")

    config = _build_config(connector)
    mm_conn = SAPMMConnector(config)

    log = IntegrationSyncLog(
        connector_id=connector.id,
        module="MM",
        direction="mes_to_erp",
        status="running",
    )
    db.add(log)
    await db.flush()

    try:
        sync_result = await mm_conn.push_bom(body.bom_records)
        log.status = sync_result.status
        log.records_fetched = sync_result.records_fetched
        log.records_written = sync_result.records_written
        log.error_count = sync_result.error_count
        log.error_detail = sync_result.error_detail
        log.finished_at = datetime.now(UTC)
    except Exception as exc:
        log.status = "error"
        log.error_count = 1
        log.error_detail = str(exc)
        log.finished_at = datetime.now(UTC)

    await db.commit()
    await db.refresh(log)
    return log
