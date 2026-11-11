from fastapi import APIRouter

from app.api.v1 import (
    ai, alert_rules, auth, downtime, factories, health,
    integrations, llm_configs, machines, modules, oee,
    production, search, shift_handover, shifts, sse, users,
)

router = APIRouter()

router.include_router(health.router, tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, tags=["users"])
router.include_router(factories.router, tags=["factories"])
router.include_router(machines.router, tags=["machines"])
router.include_router(shifts.router, tags=["shifts"])
router.include_router(production.router, tags=["production"])
router.include_router(downtime.router, tags=["downtime"])
router.include_router(oee.router, tags=["oee"])
router.include_router(sse.router, prefix="/sse", tags=["sse"])
router.include_router(ai.router, tags=["ai"])
router.include_router(integrations.router)
router.include_router(modules.router)
router.include_router(llm_configs.router, tags=["llm-configs"])
router.include_router(alert_rules.router, tags=["alert-rules"])
router.include_router(shift_handover.router, tags=["shift-handover"])
router.include_router(search.router)
