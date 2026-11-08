from __future__ import annotations

import base64
import time
from typing import Any

import httpx


class OracleRESTClient:
    _DEFAULT_TIMEOUT = 30.0
    _REST_VERSION = "11.13.18.05"

    def __init__(
        self,
        base_url: str,
        username: str,
        password: str,
        org_id: str | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._org_id = org_id
        token = base64.b64encode(f"{username}:{password}".encode()).decode()
        self._headers = {
            "Authorization": f"Basic {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _resource_url(self, resource: str) -> str:
        return f"{self._base_url}/fscmRestApi/resources/{self._REST_VERSION}/{resource}"

    async def get(self, resource: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = self._resource_url(resource)
        p = params or {}
        if self._org_id and "q" not in p:
            p.setdefault("q", f"InventoryOrganizationCode='{self._org_id}'")
        async with httpx.AsyncClient(timeout=self._DEFAULT_TIMEOUT, verify=False) as client:
            resp = await client.get(url, headers=self._headers, params=p)
            resp.raise_for_status()
            return resp.json()

    async def post(self, resource: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = self._resource_url(resource)
        async with httpx.AsyncClient(timeout=self._DEFAULT_TIMEOUT, verify=False) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def ping(self) -> tuple[bool, float, str]:
        start = time.monotonic()
        try:
            url = f"{self._base_url}/fscmRestApi/resources/{self._REST_VERSION}/inventoryOrganizations"
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                resp = await client.get(url, headers=self._headers, params={"limit": 1})
                latency_ms = round((time.monotonic() - start) * 1000, 1)
                if resp.status_code in (200, 401):
                    ok = resp.status_code == 200
                    msg = "Connected to Oracle ERP Cloud" if ok else f"Auth failed (HTTP {resp.status_code})"
                    return ok, latency_ms, msg
                return False, latency_ms, f"HTTP {resp.status_code}"
        except httpx.ConnectError as e:
            return False, 0.0, f"Connection refused: {e}"
        except httpx.TimeoutException:
            return False, 10000.0, "Timeout reaching Oracle host"
        except Exception as e:
            return False, 0.0, str(e)
