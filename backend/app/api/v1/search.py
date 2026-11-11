"""Full-text search via OpenSearch."""
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.config import get_settings
from app.api.deps import get_current_user

router = APIRouter(prefix="/search", tags=["search"])

INDEX_BY_TYPE = {
    "telemetry": "mes-telemetry",
    "downtime": "mes-downtime",
    "production": "mes-production",
    "investigations": "mes-investigations",
    "all": ["mes-telemetry", "mes-downtime", "mes-production", "mes-investigations"],
}


class SearchRequest(BaseModel):
    query: str
    type: str = "all"
    from_: int = 0
    size: int = 20


class SearchHit(BaseModel):
    id: str
    index: str
    score: float | None
    source: dict[str, Any]


class SearchResponse(BaseModel):
    total: int
    took_ms: int
    hits: list[SearchHit]


def _os_url(settings) -> str | None:
    url = getattr(settings, "opensearch_url", "")
    return url if url else None


@router.post("", response_model=SearchResponse)
async def search(
    body: SearchRequest,
    _current_user=Depends(get_current_user),
):
    settings = get_settings()
    os_url = _os_url(settings)
    if not os_url:
        raise HTTPException(503, detail="Search service not configured (OPENSEARCH_URL not set)")

    index = INDEX_BY_TYPE.get(body.type)
    if index is None:
        raise HTTPException(400, detail=f"Unknown type '{body.type}'. Use: {list(INDEX_BY_TYPE)}")

    index_path = ",".join(index) if isinstance(index, list) else index
    os_query = {
        "from": body.from_,
        "size": body.size,
        "query": {
            "multi_match": {
                "query": body.query,
                "fields": ["*"],
                "type": "best_fields",
                "fuzziness": "AUTO",
            }
        },
        "highlight": {
            "fields": {"*": {}},
            "pre_tags": ["<mark>"],
            "post_tags": ["</mark>"],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{os_url}/{index_path}/_search",
                json=os_query,
                headers={"Content-Type": "application/json"},
            )
        resp.raise_for_status()
    except httpx.RequestError as exc:
        raise HTTPException(503, detail=f"OpenSearch unreachable: {exc}")
    except httpx.HTTPStatusError as exc:
        raise HTTPException(502, detail=f"OpenSearch error: {exc.response.text[:200]}")

    data = resp.json()
    hits_raw = data.get("hits", {})
    total = hits_raw.get("total", {}).get("value", 0)
    took_ms = data.get("took", 0)

    hits = [
        SearchHit(
            id=h["_id"],
            index=h["_index"],
            score=h.get("_score"),
            source=h.get("_source", {}),
        )
        for h in hits_raw.get("hits", [])
    ]

    return SearchResponse(total=total, took_ms=took_ms, hits=hits)


@router.get("/indices", tags=["search"])
async def list_indices(_current_user=Depends(get_current_user)):
    settings = get_settings()
    os_url = _os_url(settings)
    if not os_url:
        raise HTTPException(503, detail="Search service not configured")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{os_url}/_cat/indices?format=json&h=index,docs.count,store.size,health")
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        raise HTTPException(503, detail=str(exc))
