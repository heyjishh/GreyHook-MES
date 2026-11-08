from __future__ import annotations

import abc
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ConnectorConfig:
    system_type: str
    base_url: str
    auth_type: str
    username: str
    password: str
    sap_client: str | None = None
    sap_plant: str | None = None
    oracle_org_id: str | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class SyncResult:
    module: str
    direction: str
    status: str
    records_fetched: int = 0
    records_written: int = 0
    error_count: int = 0
    error_detail: str | None = None
    duration_ms: float = 0.0
    data: list[dict[str, Any]] = field(default_factory=list)


class BaseConnector(abc.ABC):
    MODULE_ID: str = ""
    DISPLAY_NAME: str = ""
    DIRECTION: str = "erp_to_mes"

    def __init__(self, config: ConnectorConfig) -> None:
        self._config = config

    @abc.abstractmethod
    async def test_connection(self) -> tuple[bool, float, str, dict[str, Any] | None]:
        """Return (ok, latency_ms, message, system_info)."""

    @abc.abstractmethod
    async def pull(self, full_refresh: bool = False) -> SyncResult:
        """Fetch data from ERP into MES."""

    async def push(self, records: list[dict[str, Any]]) -> SyncResult:
        return SyncResult(
            module=self.MODULE_ID,
            direction="mes_to_erp",
            status="error",
            error_detail="push not implemented for this module",
        )

    def _start_timer(self) -> float:
        return time.monotonic()

    def _elapsed_ms(self, start: float) -> float:
        return round((time.monotonic() - start) * 1000, 1)
