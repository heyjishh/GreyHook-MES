from __future__ import annotations

import base64
from typing import Any

import httpx


class SAPODataClient:
    _DEFAULT_TIMEOUT = 30.0

    def __init__(
        self,
        base_url: str,
        username: str,
        password: str,
        sap_client: str | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._sap_client = sap_client
        token = base64.b64encode(f"{username}:{password}".encode()).decode()
        headers: dict[str, str] = {
            "Authorization": f"Basic {token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if sap_client:
            headers["sap-client"] = sap_client
        self._headers = headers

    async def get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        async with httpx.AsyncClient(timeout=self._DEFAULT_TIMEOUT, verify=False) as client:
            resp = await client.get(url, headers=self._headers, params=params or {})
            resp.raise_for_status()
            return resp.json()

    async def post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        async with httpx.AsyncClient(timeout=self._DEFAULT_TIMEOUT, verify=False) as client:
            resp = await client.post(url, headers=self._headers, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def patch(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self._base_url}{path}"
        async with httpx.AsyncClient(timeout=self._DEFAULT_TIMEOUT, verify=False) as client:
            resp = await client.patch(url, headers=self._headers, json=payload)
            resp.raise_for_status()
            return resp.json()

    async def ping(self) -> tuple[bool, float, str]:
        import time
        start = time.monotonic()
        try:
            url = f"{self._base_url}/sap/opu/odata/sap/CATALOGSERVICE/ServiceCollection?$top=1"
            async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
                resp = await client.get(url, headers=self._headers)
                latency_ms = round((time.monotonic() - start) * 1000, 1)
                if resp.status_code in (200, 401):
                    ok = resp.status_code == 200
                    msg = "Connected" if ok else f"Auth failed (HTTP {resp.status_code})"
                    return ok, latency_ms, msg
                return False, latency_ms, f"HTTP {resp.status_code}"
        except httpx.ConnectError as e:
            return False, 0.0, f"Connection refused: {e}"
        except httpx.TimeoutException:
            return False, 10000.0, "Timeout reaching SAP host"
        except Exception as e:
            return False, 0.0, str(e)
