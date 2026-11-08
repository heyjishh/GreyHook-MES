from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.sap.client import SAPODataClient


_SD_DELIVERY_PATH = "/sap/opu/odata4/sap/api_outbound_delivery_srv/srvd_a2x/sap/outbound_delivery/0001/OutboundDelivery"
_SD_SALES_ORDER_PATH = "/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder"


class SAPSDConnector(BaseConnector):
    MODULE_ID = "SD"
    DISPLAY_NAME = "Sales & Distribution (SD)"
    DIRECTION = "erp_to_mes"

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
                "SalesOrder,SalesOrderType,SoldToParty,RequestedDeliveryDate,"
                "SalesOrderDate,TransactionCurrency,NetAmount,OverallDeliveryStatus"
            ),
        }

        try:
            raw = await self._client.get(_SD_SALES_ORDER_PATH, params)
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

    def _normalize_order(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "erp_id": raw.get("SalesOrder", ""),
            "erp_system": "sap_s4hana",
            "module": self.MODULE_ID,
            "order_number": raw.get("SalesOrder", ""),
            "material_number": raw.get("SoldToParty"),
            "planned_finish": raw.get("RequestedDeliveryDate"),
            "erp_status": raw.get("OverallDeliveryStatus"),
            "raw_payload": raw,
        }
