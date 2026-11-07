import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_sse_no_token_returns_422(async_client, test_factory):
    response = await async_client.get(
        f"/api/v1/sse/machines/{test_factory.id}/status"
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_sse_invalid_token_returns_401(async_client, test_factory):
    response = await async_client.get(
        f"/api/v1/sse/machines/{test_factory.id}/status?token=not-a-valid-jwt"
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_sse_nonexistent_factory_returns_404(async_client, admin_token):
    fake_id = uuid.uuid4()

    class _EmptySessionCtx:
        async def __aenter__(self):
            mock = AsyncMock()
            mock.execute.return_value = MagicMock(
                scalar_one_or_none=MagicMock(return_value=None)
            )
            return mock

        async def __aexit__(self, *_):
            pass

    with patch("app.api.v1.sse.AsyncSessionLocal", return_value=_EmptySessionCtx()):
        response = await async_client.get(
            f"/api/v1/sse/machines/{fake_id}/status?token={admin_token}"
        )
    assert response.status_code == 404
