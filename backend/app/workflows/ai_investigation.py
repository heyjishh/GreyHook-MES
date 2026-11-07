from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from temporalio import activity, workflow
from temporalio.common import RetryPolicy
from temporalio.exceptions import ActivityError, ApplicationError


@dataclass
class AIInvestigationInput:
    investigation_id: str
    organization_id: str
    question: str
    context: dict = field(default_factory=dict)


@activity.defn(name="fetch_machine_history")
async def fetch_machine_history(
    organization_id: str,
    machine_id: str | None,
    from_time: str,
    to_time: str,
) -> list[dict]:
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.telemetry import MachineStatePeriod

    if not machine_id:
        return []

    org_uuid = uuid.UUID(organization_id)
    machine_uuid = uuid.UUID(machine_id)
    from_dt = datetime.fromisoformat(from_time)
    to_dt = datetime.fromisoformat(to_time)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(MachineStatePeriod)
            .where(
                MachineStatePeriod.organization_id == org_uuid,
                MachineStatePeriod.machine_id == machine_uuid,
                MachineStatePeriod.started_at >= from_dt,
                MachineStatePeriod.started_at <= to_dt,
            )
            .order_by(MachineStatePeriod.started_at)
            .limit(200)
        )
        periods = result.scalars().all()

    return [
        {
            "state": p.state,
            "started_at": p.started_at.isoformat(),
            "ended_at": p.ended_at.isoformat() if p.ended_at else None,
            "duration_seconds": p.duration_seconds,
        }
        for p in periods
    ]


@activity.defn(name="fetch_downtime_events")
async def fetch_downtime_events(
    organization_id: str,
    machine_id: str | None,
    from_time: str,
    to_time: str,
) -> list[dict]:
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.downtime import DowntimeEvent

    org_uuid = uuid.UUID(organization_id)
    from_dt = datetime.fromisoformat(from_time)
    to_dt = datetime.fromisoformat(to_time)

    query = select(DowntimeEvent).where(
        DowntimeEvent.organization_id == org_uuid,
        DowntimeEvent.started_at >= from_dt,
        DowntimeEvent.started_at <= to_dt,
    )
    if machine_id:
        query = query.where(DowntimeEvent.machine_id == uuid.UUID(machine_id))

    async with AsyncSessionLocal() as db:
        result = await db.execute(query.order_by(DowntimeEvent.started_at).limit(100))
        events = result.scalars().all()

    return [
        {
            "category": e.category,
            "reason": e.reason,
            "started_at": e.started_at.isoformat(),
            "ended_at": e.ended_at.isoformat() if e.ended_at else None,
            "duration_seconds": e.duration_seconds,
            "is_planned": e.is_planned,
        }
        for e in events
    ]


@activity.defn(name="fetch_production_summary")
async def fetch_production_summary(
    organization_id: str,
    machine_id: str | None,
    from_time: str,
    to_time: str,
) -> dict:
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.factory import ProductionLine
    from app.models.machine import Machine
    from app.models.production import ProductionOrder

    org_uuid = uuid.UUID(organization_id)
    from_dt = datetime.fromisoformat(from_time)
    to_dt = datetime.fromisoformat(to_time)

    async with AsyncSessionLocal() as db:
        query = (
            select(ProductionOrder)
            .where(
                ProductionOrder.organization_id == org_uuid,
                ProductionOrder.planned_start >= from_dt,
                ProductionOrder.planned_start <= to_dt,
            )
            .limit(50)
        )
        if machine_id:
            machine_uuid = uuid.UUID(machine_id)
            machine_result = await db.execute(
                select(Machine).where(Machine.id == machine_uuid, Machine.organization_id == org_uuid)
            )
            machine = machine_result.scalar_one_or_none()
            if machine:
                query = query.where(ProductionOrder.line_id == machine.line_id)

        result = await db.execute(query)
        orders = result.scalars().all()

    total_planned = sum(o.planned_qty for o in orders)
    total_actual = sum(o.actual_qty for o in orders)
    total_rejected = sum(o.rejected_qty for o in orders)

    return {
        "order_count": len(orders),
        "total_planned_qty": total_planned,
        "total_actual_qty": total_actual,
        "total_rejected_qty": total_rejected,
        "good_qty": total_actual - total_rejected,
        "orders": [
            {
                "order_number": o.order_number,
                "product_code": o.product_code,
                "status": o.status,
                "planned_qty": o.planned_qty,
                "actual_qty": o.actual_qty,
                "rejected_qty": o.rejected_qty,
            }
            for o in orders
        ],
    }


@activity.defn(name="call_llm_with_tools")
async def call_llm_with_tools(
    question: str,
    machine_history: list[dict],
    downtime_events: list[dict],
    production_summary: dict,
) -> dict:
    import anthropic

    from app.core.config import get_settings

    settings = get_settings()
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    context_text = json.dumps(
        {
            "machine_state_history": machine_history,
            "downtime_events": downtime_events,
            "production_summary": production_summary,
        },
        default=str,
        indent=2,
    )

    system_prompt = (
        "You are a factory intelligence AI. Analyze the provided machine data and answer the question "
        "with observations, hypotheses, and recommendations. Be concise and evidence-based. "
        "Respond ONLY with a JSON object matching this schema:\n"
        '{"summary": "string", "observations": [{"claim": "string", "evidence": [{"source": "string", "value": "any", "timestamp": "string or null"}]}], '
        '"hypotheses": [{"text": "string", "confidence": "low|medium|high", "supporting_evidence": []}], '
        '"recommendations": [{"action": "string", "rationale": "string"}]}'
    )

    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": f"Factory data context:\n{context_text}\n\nQuestion: {question}",
            }
        ],
    )

    raw_text = message.content[0].text if message.content else "{}"
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {
            "summary": raw_text,
            "observations": [],
            "hypotheses": [],
            "recommendations": [],
        }


@activity.defn(name="store_ai_result")
async def store_ai_result(
    investigation_id: str,
    status: str,
    result: dict | None,
) -> None:
    from datetime import timezone

    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.ai import AIInvestigation

    inv_uuid = uuid.UUID(investigation_id)
    async with AsyncSessionLocal() as db:
        db_result = await db.execute(
            select(AIInvestigation).where(AIInvestigation.id == inv_uuid)
        )
        investigation = db_result.scalar_one_or_none()
        if investigation is None:
            return

        investigation.status = status
        investigation.result = result
        if status in ("completed", "failed"):
            investigation.completed_at = datetime.now(timezone.utc)
        await db.commit()


@workflow.defn(name="AIInvestigationWorkflow")
class AIInvestigationWorkflow:
    def __init__(self) -> None:
        self._current_activity: str = "starting"

    @workflow.run
    async def run(self, input: AIInvestigationInput) -> None:
        standard_retry = RetryPolicy(
            maximum_attempts=3,
            initial_interval=timedelta(seconds=2),
            backoff_coefficient=2.0,
            maximum_interval=timedelta(seconds=10),
        )
        no_retry = RetryPolicy(maximum_attempts=1)

        self._current_activity = "fetch_machine_history"
        machine_history: list[dict] = await workflow.execute_activity(
            fetch_machine_history,
            args=[
                input.organization_id,
                input.context.get("machine_id"),
                input.context.get("from", ""),
                input.context.get("to", ""),
            ],
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=standard_retry,
        )

        self._current_activity = "fetch_downtime_events"
        downtime_events: list[dict] = await workflow.execute_activity(
            fetch_downtime_events,
            args=[
                input.organization_id,
                input.context.get("machine_id"),
                input.context.get("from", ""),
                input.context.get("to", ""),
            ],
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=standard_retry,
        )

        self._current_activity = "fetch_production_summary"
        production_summary: dict = await workflow.execute_activity(
            fetch_production_summary,
            args=[
                input.organization_id,
                input.context.get("machine_id"),
                input.context.get("from", ""),
                input.context.get("to", ""),
            ],
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=standard_retry,
        )

        self._current_activity = "call_llm_with_tools"
        llm_result: dict | None = None
        llm_failed = False
        try:
            llm_result = await workflow.execute_activity(
                call_llm_with_tools,
                args=[
                    input.question,
                    machine_history,
                    downtime_events,
                    production_summary,
                ],
                start_to_close_timeout=timedelta(seconds=25),
                retry_policy=no_retry,
            )
        except (ActivityError, ApplicationError):
            llm_failed = True

        self._current_activity = "store_result"
        if llm_failed:
            await workflow.execute_activity(
                store_ai_result,
                args=[input.investigation_id, "failed", {"error": "LLM_TIMEOUT"}],
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=standard_retry,
            )
        else:
            await workflow.execute_activity(
                store_ai_result,
                args=[input.investigation_id, "completed", llm_result],
                start_to_close_timeout=timedelta(seconds=5),
                retry_policy=standard_retry,
            )

    @workflow.query
    def get_status(self) -> dict:
        return {"status": "running", "current_activity": self._current_activity}
