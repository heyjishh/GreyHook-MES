from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.oracle.client import OracleRESTClient


class OracleQualityConnector(BaseConnector):
    MODULE_ID = "QUALITY"
    DISPLAY_NAME = "Oracle Quality Management"
    DIRECTION = "bidirectional"

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self._client = OracleRESTClient(config.base_url, config.username, config.password, config.oracle_org_id)

    async def test_connection(self) -> tuple[bool, float, str, dict[str, Any] | None]:
        ok, latency, msg = await self._client.ping()
        return ok, latency, msg, {"module": self.MODULE_ID} if ok else None

    async def pull(self, full_refresh: bool = False) -> SyncResult:
        start = self._start_timer()
        params: dict[str, Any] = {
            "limit": 500,
            "fields": "CollectionId,PlanId,SpecificationName,ItemNumber,WorkOrderNumber,"
                      "CollectionDate,Status,Disposition,TransactionQuantity",
        }

        try:
            raw = await self._client.get("qualityInspectionResults", params)
            results = raw.get("items", [])
            normalized = [self._normalize_result(r) for r in results]
            return SyncResult(
                module=self.MODULE_ID,
                direction="erp_to_mes",
                status="success",
                records_fetched=len(results),
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
                    "WorkOrderNumber": rec.get("work_order"),
                    "ItemNumber": rec.get("material_number"),
                    "InspectionDate": rec.get("inspection_date"),
                    "Disposition": rec.get("disposition", "ACCEPT"),
                    "DefectQuantity": rec.get("defect_qty", 0),
                    "Comments": rec.get("comments", ""),
                }
                await self._client.post("qualityInspectionResults", payload)
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

    def _normalize_result(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "erp_id": str(raw.get("CollectionId", "")),
            "erp_system": "oracle_erp_cloud",
            "module": self.MODULE_ID,
            "order_number": str(raw.get("CollectionId", "")),
            "material_number": raw.get("ItemNumber"),
            "erp_status": raw.get("Disposition"),
            "planned_start": raw.get("CollectionDate"),
            "raw_payload": raw,
        }
