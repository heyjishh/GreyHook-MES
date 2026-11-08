from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.sap.client import SAPODataClient


_MM_STOCK_PATH = "/sap/opu/odata4/sap/api_material_stock/srvd_a2x/sap/materialstock/0001/MatlStkInAcctMod"
_MM_MATERIAL_PATH = "/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product"
_MM_GR_PATH = "/sap/opu/odata4/sap/api_goodsmvt/srvd_a2x/sap/goodsmvt/0001/GoodsMovement"
_BOM_HEADER_PATH = "/sap/opu/odata4/sap/api_bill_of_material/srvd_a2x/sap/billofmaterial/0001/BillOfMaterialHeader"
_BOM_ITEM_PATH = "/sap/opu/odata4/sap/api_bill_of_material/srvd_a2x/sap/billofmaterial/0001/BillOfMaterialItem"


class SAPMMConnector(BaseConnector):
    MODULE_ID = "MM"
    DISPLAY_NAME = "Materials Management (MM)"
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
            "$top": 1000,
            "$select": "Material,Plant,StorageLocation,MaterialBaseUnit,MatlWrhsStkQtyInMatBaseUnit,InventoryStockType",
        }
        if self._config.sap_plant:
            params["$filter"] = f"Plant eq '{self._config.sap_plant}'"

        try:
            raw = await self._client.get(_MM_STOCK_PATH, params)
            items = raw.get("value", [])
            normalized = [self._normalize_material(m) for m in items]
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
                    "GoodsMovementCode": "01",
                    "Header": {"GoodsMovementType": rec.get("movement_type", "101")},
                    "Item": [{
                        "Material": rec["material_number"],
                        "Plant": rec.get("plant", self._config.sap_plant),
                        "StorageLocation": rec.get("storage_location"),
                        "Quantity": str(rec.get("qty", 0)),
                        "BaseUnit": rec.get("unit"),
                        "PurchaseOrder": rec.get("purchase_order"),
                        "PurchaseOrderItem": rec.get("po_item"),
                    }],
                }
                await self._client.post(_MM_GR_PATH, payload)
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

    async def push_bom(self, bom_records: list[dict[str, Any]]) -> SyncResult:
        start = self._start_timer()
        written = 0
        errors = 0
        for bom in bom_records:
            try:
                header_payload = {
                    "BillOfMaterialVariant": bom.get("bom_variant", "1"),
                    "BillOfMaterialType": bom.get("bom_type", "M"),
                    "Material": bom["material"],
                    "Plant": bom.get("plant", self._config.sap_plant),
                    "BillOfMaterialVariantUsage": bom.get("usage", "1"),
                    "BaseQuantity": str(bom.get("base_qty", 1)),
                    "BaseUnit": bom.get("base_unit", "EA"),
                }
                header_res = await self._client.post(_BOM_HEADER_PATH, header_payload)
                bom_no = header_res.get("BillOfMaterial", "")

                for item in bom.get("items", []):
                    item_payload = {
                        "BillOfMaterial": bom_no,
                        "BillOfMaterialCategory": "M",
                        "BillOfMaterialVariant": bom.get("bom_variant", "1"),
                        "BillOfMaterialItemNodeNumber": item.get("node_no"),
                        "ComponentScrapInPercent": str(item.get("scrap_pct", 0)),
                        "BOMItemDescription": item.get("description", ""),
                        "BillOfMaterialComponent": item["component"],
                        "ComponentQuantity": str(item.get("qty", 1)),
                        "ComponentUnit": item.get("unit", "EA"),
                    }
                    await self._client.post(_BOM_ITEM_PATH, item_payload)

                written += 1
            except Exception:
                errors += 1

        return SyncResult(
            module=self.MODULE_ID,
            direction="mes_to_erp",
            status="success" if errors == 0 else "partial",
            records_fetched=len(bom_records),
            records_written=written,
            error_count=errors,
            duration_ms=self._elapsed_ms(start),
        )

    def _normalize_material(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "material_number": raw.get("Material", ""),
            "description": raw.get("MaterialDescription"),
            "material_type": raw.get("MaterialType"),
            "base_unit": raw.get("MaterialBaseUnit"),
            "stock_qty": raw.get("MatlWrhsStkQtyInMatBaseUnit"),
            "plant": raw.get("Plant") or self._config.sap_plant,
            "storage_location": raw.get("StorageLocation"),
            "raw_payload": raw,
        }
