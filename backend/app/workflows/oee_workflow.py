from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from temporalio import activity, workflow
from temporalio.common import RetryPolicy


@dataclass
class OEEComputeInput:
    organization_id: str


@activity.defn(name="compute_oee_for_all_machines")
async def compute_oee_for_all_machines(org_id: str) -> None:
    from sqlalchemy import select

    from app.core.database import AsyncSessionLocal
    from app.models.machine import Machine
    from app.services.oee_calculator import compute_and_store_oee

    organization_id = uuid.UUID(org_id)
    now = datetime.now(timezone.utc)
    period_end = now.replace(minute=0, second=0, microsecond=0)
    period_start = period_end - timedelta(hours=1)

    async with AsyncSessionLocal() as db:
        machine_result = await db.execute(
            select(Machine).where(
                Machine.organization_id == organization_id,
                Machine.is_active == True,
            )
        )
        machines = machine_result.scalars().all()

        for machine in machines:
            await compute_and_store_oee(
                db=db,
                machine_id=machine.id,
                org_id=organization_id,
                period_start=period_start,
                period_end=period_end,
                granularity="hour",
            )


@workflow.defn(name="OEEComputeWorkflow")
class OEEComputeWorkflow:
    @workflow.run
    async def run(self, input: OEEComputeInput) -> None:
        retry_policy = RetryPolicy(
            maximum_attempts=3,
            initial_interval=timedelta(seconds=2),
            backoff_coefficient=2.0,
            maximum_interval=timedelta(seconds=30),
        )

        await workflow.execute_activity(
            compute_oee_for_all_machines,
            input.organization_id,
            start_to_close_timeout=timedelta(minutes=10),
            retry_policy=retry_policy,
        )

        await asyncio.sleep(15 * 60)
        workflow.continue_as_new(input)
