from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.sap.client import SAPODataClient


_PM_NOTIFICATION_PATH = "/sap/opu/odata4/sap/api_maintnotification/srvd_a2x/sap/maintnotification/0001/MaintNotification"
_PM_ORDER_PATH = "/sap/opu/odata4/sap/api_maintenanceorder/srvd_a2x/sap/maintenanceorder/0001/MaintenanceOrder"
_PM_EQUIPMENT_PATH = "/sap/opu/odata/sap/API_EQUIPMENT/Equipment"


class SAPPMConnector(BaseConnector):
    MODULE_ID = "PM"
    DISPLAY_NAME = "Plant Maintenance (PM)"
    DIRECTION = "bidirectional"

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self._client = SAPODataClient(config.base_url, config.username, config.password, config.sap_client)

    async def test_connection(self) -> tuple[bool, float, str, dict[str, Any] | None]:
        ok, latency, msg = await self._client.ping()
        return ok, latency, msg, {"module": self.MODULE_ID} if ok else None

    async def pull(self, full_refresh: bool = False) -> SyncResult:
        start = self._start_timer()
        params: dict[str, Any] = {
            "$top": 500,
            "$select": (
                "MaintenanceOrder,MaintenanceOrderType,Equipment,FunctionalLocation,"
                "MaintOrdBasicStartDateTime,MaintOrdBasicEndDateTime,"
                "MaintenanceOrderStatus,MaintenancePlannerGroup,MaintOrderDescription"
            ),
        }
        if self._config.sap_plant:
            params["$filter"] = f"MaintenancePlant eq '{self._config.sap_plant}'"

        try:
            raw = await self._client.get(_PM_ORDER_PATH, params)
            orders = raw.get("value", [])
            normalized = [self._normalize_order(o) for o in orders]
            return SyncResult(
                module=self.MODULE_ID,
                direction="erp_to_mes",
                status="success",
                records_fetched=len(orders),
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
                    "NotificationType": rec.get("notification_type", "M2"),
                    "Equipment": rec.get("equipment_id", ""),
                    "FunctionalLocation": rec.get("functional_location", ""),
                    "MalfunctionStartDate": rec.get("start_date", ""),
                    "MalfunctionStartTime": rec.get("start_time", ""),
                    "ShortText": rec.get("description", "Machine fault reported by MES"),
                    "LongText": rec.get("details", ""),
                }
                await self._client.post(_PM_NOTIFICATION_PATH, payload)
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

    def _normalize_order(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "erp_id": raw.get("MaintenanceOrder", ""),
            "erp_system": "sap_s4hana",
            "module": self.MODULE_ID,
            "order_number": raw.get("MaintenanceOrder", ""),
            "material_number": raw.get("Equipment"),
            "material_description": raw.get("MaintOrderDescription"),
            "plant": self._config.sap_plant,
            "erp_status": raw.get("MaintenanceOrderStatus"),
            "planned_start": raw.get("MaintOrdBasicStartDateTime"),
            "planned_finish": raw.get("MaintOrdBasicEndDateTime"),
            "raw_payload": raw,
        }
