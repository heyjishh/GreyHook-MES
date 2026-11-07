# Project Status — GreyHook MES

**Last updated**: 2026-11-04  
**Current phase**: Phase 2 — Core platform (Weeks 3–4)  
**Current milestone**: Week 3 — AI investigation + pilot integrations

---

## Phase progress

| Phase | Name | Weeks | Status |
|-------|------|-------|--------|
| 1 | Foundation | 1–2 | DONE |
| 2 | Core platform | 3–4 | IN PROGRESS |
| 3 | Industrial connectivity | 5–6 | BACKLOG |
| 4 | Production intelligence | 7–8 | BACKLOG |
| 5 | AI intelligence | 9–10 | BACKLOG |
| 6 | Pilot readiness | 11–12 | BACKLOG |

---

## Week 1 checklist

| Task ID | Description | Owner | Status |
|---------|-------------|-------|--------|
| FIO-001 | Product vision and PRD | Agent 1 | DONE |
| FIO-002 | Manufacturing/OEE definitions | Agent 1 | READY |
| FIO-003 | System architecture | Agent 2 + Orchestrator | DONE |
| FIO-004 | API and database contracts | Agent 2 | DONE |
| FIO-005 | Frontend design system + wireframes | Agent 3 | DONE |
| FIO-006 | Backend foundation and auth | Agent 2 | DONE |
| FIO-007 | Factory simulator (Rust) | Agent 2 | DONE |
| FIO-008 | Rust edge gateway + telemetry processor | Agent 2 | DONE |
| FIO-009 | Factory dashboard shell (Next.js) | Agent 3 | DONE |
| FIO-010 | OEE analytics engine | Agent 2 | DONE |

---

## Frozen contracts

API Contract v0.2 — FROZEN (approved by founder 2026-11-04).
Database Schema v0.2 — FROZEN (approved by founder 2026-11-04).

**Gate G1 (Requirements)**: CLOSED — PRD and user stories approved by founder 2026-11-04.
**Gate G2 (Architecture)**: CLOSED — Architecture, API contract, and DB schema approved by founder 2026-11-04.

---

## Open assumptions requiring validation

| ID | Assumption | Owner | Validation method |
|----|------------|-------|-------------------|
| A-001 | Break schedule: 30 min lunch + 2×10 min | Agent 1 | Factory field interview |
| A-002 | Ideal cycle time per machine/product | Agent 1 | Machine spec sheets |
| A-003 | Downtime taxonomy categories | Agent 1 | Supervisor interviews |
| A-004 | Auto-detect downtime at 60s offline | Agent 2 | Factory validation |

---

## Current blockers

None.

---

## Decisions pending

- [x] Freeze API contract v0.2 — DONE (2026-11-04).
- [x] Freeze database schema v0.2 — DONE (2026-11-04).
- [ ] Confirm LLM provider for initial AI implementation.
- [x] FIO-005: Frontend design system — DONE (2026-11-04).
- [x] FIO-006: Backend foundation and auth — DONE (2026-11-04).
- [x] FIO-007: Factory simulator (Rust) — DONE (2026-11-04).
- [x] FIO-009: Factory dashboard shell (Next.js) — DONE (2026-11-04).
- [x] FIO-008: Rust edge gateway + telemetry processor — DONE (2026-11-04).
- [x] FIO-010: OEE analytics engine — DONE (2026-11-04).
- [x] FIO-012: AI investigation frontend (AI page) — DONE (Agent 3; 2026-11-04).
- [x] FIO-013: AI investigation backend + Temporal workflow — DONE (2026-11-05).
- [ ] FIO-014: Security + integration testing — BACKLOG.
- [x] FIO-015: Pilot deployment infra — DONE (2026-11-05).

---

## Recent changes

- 2026-11-05: FIO-013 complete — AI investigation backend in `/backend/`. Three endpoints: `POST /api/v1/ai/investigations` (202, rate-limited 10/org/hour, starts `AIInvestigationWorkflow` via Temporal), `GET /api/v1/ai/investigations/{id}` (200, org isolation), `POST /api/v1/ai/investigations/{id}/feedback` (200/409 conflict). Temporal workflow (`AIInvestigationWorkflow`) with 5 activities: `fetch_machine_history`, `fetch_downtime_events`, `fetch_production_summary`, `call_llm_with_tools` (Anthropic `claude-sonnet-4-6`, 25s timeout, 1 retry), `store_ai_result` (5s, 3 retries). LLM failure stores status=failed with `{"error":"LLM_TIMEOUT"}`. `get_status` query handler exposes current activity. `anthropic>=0.40` added to `pyproject.toml`. 11/11 pytest tests pass (202 create, 200 get, 429 rate limit, old-investigation rate-limit bypass, 403 org isolation, 200 feedback, 409 conflict, 403 operator).
- 2026-11-04: FIO-012 complete — AI Investigations page fully wired (`frontend/src/app/dashboard/ai/page.tsx`). `useFactoryMachines` populates the machine selector. `aiApi.createInvestigation` submits the question; `aiApi.getInvestigation` polls every 2.5 s while pending/running. Result displays as four sections: Summary, Observations (each with claim + evidence items bearing source, timestamp, value), Hypotheses (confidence badge in SOFT palette), Recommendations (numbered with rationale). Feedback buttons (👍/👎) appear on completion and call `aiApi.submitFeedback`. `StatusPip` shows animated pulse while running. All chart pages updated: dark ECharts T-object replaced with light-theme values (`brand #1497C4`, `border #E4E4E7`, `grid #F4F4F5`, `axis #F3F4F6`, `label #71717A`, `bg #FFFFFF`); IBM Plex fonts replaced with DM Mono/Sans. `tsc --noEmit` has zero new errors.

## Recent changes

- 2026-11-04: FIO-010 complete — OEE analytics engine in `/backend/`. OEE calculator service (`app/services/oee_calculator.py`) queries `machine_state_periods`, `production_orders`, `product_definitions`, and `shifts` to compute Availability, Performance, Quality, OEE per machine per period using the exact formula from OEE_RULES.md with [0,1] clamping. Three new FastAPI endpoints: `GET /api/v1/oee/7day` (factory-scoped, 7-day daily aggregates), `GET /api/v1/oee/per-machine` (latest shift OEE per machine), `GET /api/v1/oee/machines/{id}/hourly` (hourly OEE with time range). Downtime pareto endpoint `GET /api/v1/downtime/pareto` (factory-scoped with cumulative %). Temporal `OEEComputeWorkflow` with 15-min periodic interval using `continue_as_new`. 27/27 pytest tests pass.
- 2026-11-04: FIO-008 complete — Rust edge gateway in `/edge/` and telemetry processor in `/telemetry-processor/`. Edge: rumqttc async MQTT subscriber on `factory/#`, routes telemetry→`mes.telemetry.raw`, events→`mes.production.events`/`mes.downtime.events` via rdkafka FutureProducer; exponential backoff reconnect (max 60s); structured JSON logs. Processor: rdkafka StreamConsumer group `telemetry-processor` on all 3 topics; SQLx writes to `machine_events` (ON CONFLICT DO NOTHING), `production_orders` (idempotent status updates), `downtime_events` (insert/update); all handlers skip on UUID parse failure. Root Cargo.toml workspace added. Multi-stage Dockerfiles in each crate. Unit tests: 11 routing tests in edge, 6 handler logic tests in telemetry-processor.
- 2026-11-04: FIO-007 complete — Rust factory simulator binary in `/simulator/`. Simulates M001 (CNC Lathe), M002 (Quality Inspection), M003 (Assembly Station) with scripted downtime events (ME-01 22-min fault, MA-01 18-min material shortage, CH-04 15-min changeover). Publishes MQTT every 5s and Kafka events (mes.telemetry.raw, mes.production.events, mes.downtime.events). State machine with Running/Idle/Fault/Offline transitions. SIM_SPEED_FACTOR support. cargo check passes. Deviations: Rust ≥1.89 required (not 1.82), libcurl4-openssl-dev in builder, rdkafka tokio feature explicit.
- 2026-11-04: FIO-009 complete — Next.js factory dashboard shell with 5 live pages: main dashboard (machine status grid with live SSE, production tile, downtime summary), machine detail (OEE breakdown, ECharts units/hour bar, downtime table), OEE analytics (7-day trend line + per-machine horizontal bar), downtime Pareto chart, production orders table. TanStack Query hooks with mock/real toggle via NEXT_PUBLIC_USE_MOCK. IBM Plex Mono/Sans, dark industrial palette (#0D0F0F base), state/OEE band colors throughout. `npx tsc --noEmit` passes.
- 2026-11-04: FIO-006 complete — FastAPI backend initialized with SQLAlchemy 2.x async models for all 15 tables, Pydantic v2 schemas, auth endpoints (JWT + Argon2 + refresh token rotation), all 11 API route files, Alembic migration 0001 with TimescaleDB hypertables, structlog, tenant isolation enforced at every query, 4 test files covering auth, tenant isolation, CRUD, and health.
- 2026-11-04: FIO-005 complete — Next.js project initialized (package.json, tsconfig.json, next.config.ts, tailwind.config.ts), design system defined (IBM Plex Mono/Sans, dark industrial palette, machine state colors, OEE bands), App Router structure created with 11 routes (dashboard, login, 5 dashboard sub-pages, 4 admin pages), 6 core layout/UI components scaffolded (Sidebar, TopBar, MachineStateChip, OEEGauge, ProductionProgress, LoadingCard), typed API client covering all endpoint groups, SSE client with 5-second reconnect backoff, and Zustand stores for auth and factory context. DESIGN_SYSTEM.md authored with full design rationale, typography, color tokens, component inventory, layout rules, motion and animation spec.
- 2026-11-04: FIO-003 and FIO-004 complete — 3 ADRs added (ADR-009: ECS Fargate selected over EKS/EC2; ADR-010: opcua crate selected for Rust edge gateway; ADR-011: Temporal Cloud selected over self-hosted for MVP). API contract extended to v0.2 with full endpoint coverage (shifts, production orders, machines, downtime PATCH/DELETE, organizations/factories/lines CRUD, users, health/metrics), Kafka event schemas for all 5 topics, and Temporal workflow interfaces for ProductionOrderWorkflow, DowntimeWorkflow, and AIInvestigationWorkflow. Database schema extended to v0.2 with product_definitions table (required for OEE Performance per OEE_RULES.md), refresh_tokens table, audit_log hypertable, kafka_consumer_checkpoints table; extended machines (default_product_id) and production_orders (product_id); added TimescaleDB hypertable config section, index strategy section, and change log. FIO-003 and FIO-004 moved to IN_REVIEW.
- 2026-11-04: FIO-001 complete — PRD and user stories written by Agent 1. PRD.md expanded to full v0.2 with all 7 sections (executive summary, problem statement, personas, feature requirements with edge cases, NFRs, demo scenario, open assumptions, pilot success metrics). USER_STORIES.md created with 25 stories covering all 6 features and all 4 personas. PROJECT_STATUS.md updated; FIO-001 moved to IN_REVIEW.
- 2026-11-04: Project initialized. All docs, agent definitions, and directory structure created.
  Stack finalized: Rust (edge + telemetry), Python/FastAPI (backend/AI), Next.js (frontend),
  Kafka/Redpanda, Temporal, Valkey, PostgreSQL/TimescaleDB.
