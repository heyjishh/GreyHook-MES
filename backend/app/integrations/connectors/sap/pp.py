from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.sap.client import SAPODataClient


_PP_ORDER_PATH = "/sap/opu/odata4/sap/api_production_order/srvd_a2x/sap/production_order/0001/ProductionOrder"
_PP_COMPONENT_PATH = "/sap/opu/odata4/sap/api_production_order/srvd_a2x/sap/production_order/0001/ProductionOrderComponent"
_PP_CONFIRMATION_PATH = "/sap/opu/odata4/sap/api_prod_order_confirmation/srvd_a2x/sap/prod_order_confirmation/0001/ProdOrderConfirmation"


class SAPPPConnector(BaseConnector):
    MODULE_ID = "PP"
    DISPLAY_NAME = "Production Planning (PP)"
    DIRECTION = "bidirectional"

    def __init__(self, config: ConnectorConfig) -> None:
        super().__init__(config)
        self._client = SAPODataClient(
            config.base_url,
            config.username,
            config.password,
            config.sap_client,
        )

    async def test_connection(self) -> tuple[bool, float, str, dict[str, Any] | None]:
        ok, latency, msg = await self._client.ping()
        info = {"module": self.MODULE_ID, "system": "SAP S/4HANA"} if ok else None
        return ok, latency, msg, info

    async def pull(self, full_refresh: bool = False) -> SyncResult:
        start = self._start_timer()
        params: dict[str, Any] = {
            "$top": 500,
            "$select": (
                "ProductionOrder,Material,ProductionOrderType,MRPPlant,"
                "TotalQuantity,MfgOrderPlannedStartDate,MfgOrderPlannedEndDate,"
                "MfgOrderActualStartDate,MfgOrderActualEndDate,"
                "ProductionOrderStatus,MfgOrderConfirmedYieldQty,"
                "ProductionUnit,MfgOrderScheduledStartDate,WorkCenter"
            ),
        }
        if self._config.sap_plant:
            params["$filter"] = f"MRPPlant eq '{self._config.sap_plant}'"

        try:
            raw = await self._client.get(_PP_ORDER_PATH, params)
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
                    "ProductionOrder": rec["order_number"],
                    "ConfirmedYieldQuantity": str(rec.get("confirmed_qty", 0)),
                    "FinalConfirmationType": "X" if rec.get("is_final") else "",
                }
                await self._client.post(_PP_CONFIRMATION_PATH, payload)
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
            "erp_id": raw.get("ProductionOrder", ""),
            "erp_system": "sap_s4hana",
            "module": self.MODULE_ID,
            "order_number": raw.get("ProductionOrder", ""),
            "material_number": raw.get("Material"),
            "material_description": raw.get("ProductionOrderDescription"),
            "planned_qty": raw.get("TotalQuantity"),
            "confirmed_qty": raw.get("MfgOrderConfirmedYieldQty"),
            "unit": raw.get("ProductionUnit"),
            "planned_start": raw.get("MfgOrderPlannedStartDate"),
            "planned_finish": raw.get("MfgOrderPlannedEndDate"),
            "actual_start": raw.get("MfgOrderActualStartDate"),
            "actual_finish": raw.get("MfgOrderActualEndDate"),
            "erp_status": raw.get("ProductionOrderStatus"),
            "work_center": raw.get("WorkCenter"),
            "plant": raw.get("MRPPlant") or self._config.sap_plant,
            "raw_payload": raw,
        }
