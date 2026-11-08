from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.oracle.client import OracleRESTClient


class OracleWMSConnector(BaseConnector):
    MODULE_ID = "WMS"
    DISPLAY_NAME = "Oracle WMS / Inventory"
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
            "limit": 1000,
            "fields": "ItemNumber,ItemDescription,PrimaryUOMCode,OnhandQuantity,"
                      "SubinventoryCode,LocatorId,LotNumber,SerialNumber",
        }
        if self._config.oracle_org_id:
            params["q"] = f"OrganizationCode='{self._config.oracle_org_id}'"

        try:
            raw = await self._client.get("inventoryOnhandQuantities", params)
            items = raw.get("items", [])
            normalized = [self._normalize_item(i) for i in items]
            return SyncResult(
                module=self.MODULE_ID,
                direction="erp_to_mes",
                status="success",
                records_fetched=len(items),
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
                    "TransactionType": rec.get("transaction_type", "WIP Issue"),
                    "ItemNumber": rec["material_number"],
                    "PrimaryQuantity": rec.get("qty", 0),
                    "PrimaryUOMCode": rec.get("unit"),
                    "SubinventoryCode": rec.get("subinventory"),
                    "WorkOrderNumber": rec.get("work_order"),
                }
                await self._client.post("inventoryTransactions", payload)
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

    def _normalize_item(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "material_number": raw.get("ItemNumber", ""),
            "description": raw.get("ItemDescription"),
            "material_type": "INV",
            "base_unit": raw.get("PrimaryUOMCode"),
            "stock_qty": str(raw.get("OnhandQuantity", "")),
            "plant": self._config.oracle_org_id,
            "storage_location": raw.get("SubinventoryCode"),
            "raw_payload": raw,
        }
