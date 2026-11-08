from __future__ import annotations

from typing import Any

from app.integrations.base import BaseConnector, ConnectorConfig, SyncResult
from app.integrations.connectors.sap.client import SAPODataClient


_QM_INSPECTION_LOT_PATH = "/sap/opu/odata4/sap/api_inspectionlot/srvd_a2x/sap/inspectionlot/0001/InspectionLot"
_QM_RESULT_PATH = "/sap/opu/odata4/sap/api_inspectionresult/srvd_a2x/sap/inspectionresult/0001/InspectionResultForCharacteristic"
_QM_DEFECT_PATH = "/sap/opu/odata4/sap/api_defect/srvd_a2x/sap/defect/0001/Defect"


class SAPQMConnector(BaseConnector):
    MODULE_ID = "QM"
    DISPLAY_NAME = "Quality Management (QM)"
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
                "InspectionLot,InspectionLotType,Material,Plant,ProductionOrder,"
                "InspectionLotStatus,InspectionLotStatusName,InspectionLotQty,"
                "InspectionLotCreationDate,InspectionLotEndDate"
            ),
        }
        if self._config.sap_plant:
            params["$filter"] = f"Plant eq '{self._config.sap_plant}'"

        try:
            raw = await self._client.get(_QM_INSPECTION_LOT_PATH, params)
            lots = raw.get("value", [])
            normalized = [self._normalize_lot(l) for l in lots]
            return SyncResult(
                module=self.MODULE_ID,
                direction="erp_to_mes",
                status="success",
                records_fetched=len(lots),
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
                    "InspectionLot": rec["inspection_lot"],
                    "DefectCode": rec.get("defect_code", ""),
                    "DefectLocation": rec.get("location", ""),
                    "NumberOfDefects": str(rec.get("count", 1)),
                    "LongTextForDefect": rec.get("description", ""),
                }
                await self._client.post(_QM_DEFECT_PATH, payload)
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

    def _normalize_lot(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "erp_id": raw.get("InspectionLot", ""),
            "erp_system": "sap_s4hana",
            "module": self.MODULE_ID,
            "order_number": raw.get("InspectionLot", ""),
            "material_number": raw.get("Material"),
            "plant": raw.get("Plant") or self._config.sap_plant,
            "erp_status": raw.get("InspectionLotStatus"),
            "planned_qty": raw.get("InspectionLotQty"),
            "planned_start": raw.get("InspectionLotCreationDate"),
            "planned_finish": raw.get("InspectionLotEndDate"),
            "raw_payload": raw,
        }
