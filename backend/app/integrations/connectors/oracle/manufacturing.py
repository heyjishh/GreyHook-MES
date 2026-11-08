from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.oracle.client import OracleRESTClient


class OracleManufacturingConnector(BaseConnector):
    MODULE_ID = "MFG"
    DISPLAY_NAME = "Oracle Manufacturing"
    DIRECTION = "bidirectional"

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self._client = OracleRESTClient(config.base_url, config.username, config.password, config.oracle_org_id)

    async def test_connection(self) -> tuple[bool, float, str, dict[str, Any] | None]:
        ok, latency, msg = await self._client.ping()
        return ok, latency, msg, {"module": self.MODULE_ID, "system": "Oracle ERP Cloud"} if ok else None

    async def pull(self, full_refresh: bool = False) -> SyncResult:
        start = self._start_timer()
        params: dict[str, Any] = {
            "limit": 500,
            "fields": "WorkOrderNumber,ItemNumber,ItemDescription,StartQuantity,CompletedQuantity,"
                      "ScrapQuantity,PlannedStartDate,PlannedCompletionDate,ActualStartDate,"
                      "ActualCompletionDate,StatusCode,StatusMeaning,WorkCenterCode,OperationSeqNumber",
        }
        if self._config.oracle_org_id:
            params["q"] = f"OrganizationCode='{self._config.oracle_org_id}'"

        try:
            raw = await self._client.get("productionJobs", params)
            jobs = raw.get("items", [])
            normalized = [self._normalize_job(j) for j in jobs]
            return SyncResult(
                module=self.MODULE_ID,
                direction="erp_to_mes",
                status="success",
                records_fetched=len(jobs),
                records_written=len(normalized),
                duration_ms=self._elapsed_ms(start),
                data=normalized,
            )
        except Exception as exc:
            return SyncResult(
                module=self.MODULE_ID,
                direction="erp_to_mes",
                status="error",
                error_count=1,
                error_detail=str(exc),
                duration_ms=self._elapsed_ms(start),
            )

    async def push(self, records: list[dict[str, Any]]) -> SyncResult:
        start = self._start_timer()
        written = 0
        errors = 0
        for rec in records:
            try:
                payload = {
                    "WorkOrderNumber": rec["order_number"],
                    "TransactionType": "COMPLETION",
                    "PrimaryQuantity": rec.get("confirmed_qty", 0),
                    "TransactionDate": rec.get("transaction_date"),
                }
                await self._client.post("productionJobs/action/complete", payload)
                written += 1
            except Exception:
                errors += 1

        return SyncResult(
            module=self.MODULE_ID,
            direction="mes_to_erp",
            status="success" if errors == 0 else "partial",
            records_fetched=len(records),
            records_written=written,
            error_count=errors,
            duration_ms=self._elapsed_ms(start),
        )

    def _normalize_job(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "erp_id": raw.get("WorkOrderNumber", ""),
            "erp_system": "oracle_erp_cloud",
            "module": self.MODULE_ID,
            "order_number": raw.get("WorkOrderNumber", ""),
            "material_number": raw.get("ItemNumber"),
            "material_description": raw.get("ItemDescription"),
            "planned_qty": str(raw.get("StartQuantity", "")),
            "confirmed_qty": str(raw.get("CompletedQuantity", "")),
            "unit": raw.get("PrimaryUOM"),
            "planned_start": raw.get("PlannedStartDate"),
            "planned_finish": raw.get("PlannedCompletionDate"),
            "actual_start": raw.get("ActualStartDate"),
            "actual_finish": raw.get("ActualCompletionDate"),
            "erp_status": raw.get("StatusMeaning"),
            "work_center": raw.get("WorkCenterCode"),
            "plant": self._config.oracle_org_id,
            "raw_payload": raw,
        }
