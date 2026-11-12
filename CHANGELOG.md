# Changelog

All notable changes to GreyHook MES are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

---

## [0.5.0] — 2026-11-12

### Added

**7 backend APIs for previously mock-only frontend pages**

- **SPC (Statistical Process Control)** — `GET /spc/charts?machine_id=&tag=&hours=` returns control chart data: mean, UCL (mean+3σ), LCL (mean-3σ), std dev, and a list of out-of-control points from live telemetry.
- **Quality inspections** — `GET/POST/PATCH /quality/inspections` — inspection records with type, status, result, defect count, sample size, and inspector. Migration 0005 creates the `quality_inspections` table.
- **Traceability** — `GET /traceability/lots` and `GET /traceability/lots/{lot_id}/genealogy` — lot tracking derived from production orders and BOM linkage (no extra table needed for MVP).
- **Energy monitoring** — `GET /energy` — per-machine kWh consumption derived from power telemetry or state-based estimation (running=15 kWh/h, idle=3 kWh/h, fault=1 kWh/h). Returns factory total and cost estimate at ₹8/kWh.
- **Labor tracking** — `GET /labor/operators` and `GET /labor/utilization` — operator list from users table (role=operator) with shift and order completion stats.
- **Scheduling** — `GET /scheduling/jobs`, `GET /scheduling/gantt`, `PATCH /scheduling/jobs/{id}/priority` — production orders as job cards with priority reordering and gantt-ready time-window data.
- **Andon board** — `GET /andon/board` aggregates active machine faults, unclassified downtime, and OEE threshold alerts into a single real-time board. `POST /andon/board/{id}/acknowledge` closes an alert with a note.

**OEE Forecasting**

- `GET /forecast/oee?machine_id=&horizon_hours=24` — exponential-weighted average with 24h seasonality; returns hourly predictions with 95% confidence bands (`±1.96σ`), trend direction (`improving`/`stable`/`declining`), and an **AI-generated commentary** (2–3 sentences for a supervisor, written by Claude). Method: EWA-seasonal (arXiv:2507.02890 approach).

**AI improvements on existing endpoints**

- `POST /downtime/{id}/ai-explain` — given a downtime event ID, fetches the event plus ±15 min surrounding telemetry and returns LLM root-cause hypothesis, confidence level, and suggested corrective actions.
- `GET /oee/ai-insight?factory_id=&hours=8` — identifies the worst-performing machine factory-wide and returns a 1–2 sentence actionable insight from Claude.
- Shift handover creation (`POST /shift-handover`) — AI summary is now auto-appended to the handover notes: 3 bullet points covering production highlights, open issues, and what to watch.

**Infrastructure**

- `backend/app/services/llm_caller.py` — shared `ask_claude(prompt, db, org_id, max_tokens)` helper used by all AI-augmented endpoints; reads `LLM_PROVIDER` and `ANTHROPIC_API_KEY` from settings; falls back to a plain-text placeholder when no key is configured.
- Migration 0005 (`0005_quality_inspections.py`) — creates `quality_inspections` with org-scoped indexes.

### Fixed

- `--text-tertiary` contrast ratio raised from 3.7:1 to 8.4:1 (`#6A8A9A` → `#2E5068`), passing WCAG AA for normal text.
- `--text-disabled` lightened to `#8AAABB` (readable but visually distinct from active text).
- `--sidebar-fg-muted` bumped to `#9AB4D4` for legibility on the dark navy sidebar.

---

## [0.4.0] — 2026-11-12

### Added

**Enterprise integrations (optional profiles)**

- **Keycloak 26 SSO** (`--profile sso`) — OIDC/SAML identity provider with a pre-configured `greyhook` realm, `greyhook-mes` public client, four roles (`admin`, `manager`, `supervisor`, `operator`), `org_id` JWT claim mapper, and two seeded demo users. Enables enterprise single sign-on without backend code changes; `KEYCLOAK_ISSUER_URL` env var wires it to the backend.
- **OpenSearch 2.17.1** (`--profile search`) — single-node full-text search with four indices: `mes-telemetry`, `mes-downtime`, `mes-production`, `mes-investigations`. Security plugin disabled for self-hosted simplicity; 512 MB heap for OCI A1 Flex compatibility.
- **OpenSearch Dashboards** — visual index explorer shipped alongside OpenSearch under the same profile.
- **OpenSearch Indexer** — Python Kafka consumer (`opensearch-indexer/`) that subscribes to four MES topics and bulk-indexes telemetry, downtime events, production events, and AI investigation results with configurable batch size.
- **Full-text search API** — `POST /api/v1/search` accepts a query string and type filter (`telemetry`, `downtime`, `production`, `investigations`, `all`), returns ranked hits with highlight snippets. Returns `503` gracefully when `OPENSEARCH_URL` is not configured.
- **Node-RED 4.0** (`--profile integrations`) — visual OT/IT integration flows: MQTT → MES REST API bridge, ERP webhook receiver (`/webhook/erp/workorder`), and OEE alert poller (every 5 minutes). Pre-loaded flow tabs at `infra/node-red/flows.json`.

**Manufacturing data model**

- **BOM (Bill of Materials)** — `bom_lines` table with `organization_id`, `product_id`, `bom_ref`, component code/name, quantity (12,4 precision), unit, and criticality flag. Modelled after Odoo/iDempiere BOM line structure.
- **Routing operations** — `routing_operations` table with work center, machine type, setup time (minutes), and run time per unit (minutes). Directly maps to ISA-95 RoutingOperation; `run_time_minutes_per_unit` is the ideal cycle time source for ISO 22400 Performance factor.
- **Migration 0004** — Alembic revision adding both tables and extending `production_orders` with `bom_ref`, `routing_ref`, `notes`, and `priority` columns.

**Seed data**

- Richer demo dataset: 2 products (`AP-500` Alloy Wheel Hub, `AP-720` Gear Housing Cover), 2 production lines (A + B), 6 machines (mixed OPC-UA / MQTT / simulated protocols), 3 shifts (Morning / Afternoon / Night with correct `time()` objects and `days_of_week` arrays), 8 production orders across all statuses, 4 alert rules, 7 BOM lines, 7 routing operations, and 24-hour OEE history.

### Changed

- `docker-compose.yml` — added 5 new services (`keycloak`, `opensearch`, `opensearch-dashboards`, `opensearch-indexer`, `nodered`) all behind optional profiles; added `OPENSEARCH_URL` and `KEYCLOAK_ISSUER_URL` passthrough to backend service; added two new volumes (`opensearch_data`, `nodered_data`).
- `backend/app/core/config.py` — added `opensearch_url` and `keycloak_issuer_url` settings fields (default empty string; no-op when unset).

---

## [0.3.0] — 2026-11-10

### Added

**Wired API endpoints (dashboard pages now hit real backend)**

- Admin portal pages (`/admin/users`, `/admin/machines`, `/admin/shifts`, `/admin/alert-rules`, `/admin/llm-configs`) connected to their respective API routes; `IS_MOCK` toggle replaced with `NEXT_PUBLIC_USE_MOCK=false` env var across all hooks.
- Alert rules CRUD — `POST/GET/PATCH/DELETE /api/v1/alert-rules`; threshold-based rules with channel config (Kafka topic / webhook), severity levels, and per-org scoping.
- LLM configuration — `POST/GET /api/v1/llm-configs`; per-org LLM provider selection (Claude / OpenAI) with API key storage; used by the AI investigation engine.
- Shift management — `POST/GET/PATCH /api/v1/shifts`; named shifts with `start_time`, `end_time`, and `days_of_week` array; linked to production orders and OEE attribution.
- Shift handover — `POST /api/v1/shift-handover`; structured handover report with outgoing/incoming supervisor, machine status summary, open downtime items, and production vs target.
- Module configuration — `GET/PATCH /api/v1/modules`; per-org feature flag table enabling/disabling dashboard modules (SPC, energy, traceability, genealogy) without redeploy.

---

## [0.2.0] — 2026-11-08

### Security

- **Startup secret validation** — `config.py` now rejects known-weak `JWT_SECRET` and `POSTGRES_PASSWORD` values at application startup when `ENVIRONMENT=production`. Prevents silent insecure-defaults deployment.
- **Audit logging middleware** — all mutating API calls (`POST`, `PUT`, `PATCH`, `DELETE`) under `/api/v1/` are now recorded in the `audit_log` table with user ID, organization ID, IP address, and request ID.
- **Configurable CORS** — CORS origins are now driven entirely by the `CORS_ORIGINS` environment variable. Production defaults to no origins (deny all); `ENVIRONMENT=development` defaults to `http://localhost:3000`. Hardcoded origin lists are removed.
- **SECURITY.md** — added security policy, responsible disclosure contact (`security@greyhook.io`), deployment hardening checklist, and architecture security notes.
- **`.env.example`** — added `CORS_ORIGINS` and documented all security-relevant variables.
- **`docker-compose.yml`** — `CORS_ORIGINS` and `ENVIRONMENT` are now passed through to the backend container from the host `.env`.

### Fixed

- Frontend Docker build: `organization_id` added to `UserSchema` TypeScript interface to resolve build-time type error.
- Frontend Docker build: replaced `COPY --from=builder /app/public ./public` with `RUN mkdir -p ./public` (the `public/` directory does not exist in source).

---

## [0.1.0] — 2026-11-04

### Added

**Foundation (Phase 1)**

- Product vision and manufacturing domain definitions (OEE rules, downtime categories, shift model).
- System architecture: multi-tenant hierarchy — Organization → Business Units → Plants → Lines → Machines.
- API contract and PostgreSQL 16 + TimescaleDB schema (organizations, factories, machines, production runs, telemetry, audit log).
- FastAPI backend with async SQLAlchemy: auth (JWT Bearer, refresh tokens), RBAC (`admin` / `manager` / `supervisor` / `operator`), tenant isolation at every query boundary.
- SSE endpoint for real-time machine state streaming (authenticated via query-parameter token).
- Health endpoints: `GET /health` (liveness) and `GET /health/ready` (DB + Kafka + Valkey).
- Next.js 15 + TypeScript + Tailwind + shadcn/ui factory dashboard: live machine grid, OEE gauges, shift production chart, downtime table, AI investigation panel.
- OEE analytics engine: Availability, Performance, Quality, and Overall OEE computed from raw telemetry.
- Rust edge gateway: OPC-UA + MQTT ingestion, telemetry normalization, Kafka publish.
- Rust telemetry processor: Kafka consumer, deduplication, DB write.
- Rust factory simulator: realistic multi-machine production data generation.
- Temporal workflow engine integration (Rust workers for investigation and telemetry workflows).
- Redpanda (Kafka-compatible) message streaming with topic provisioning.
- Valkey (Redis-compatible) session cache.
- Mosquitto MQTT broker.
- Full Docker Compose stack for local development.
- Terraform for Oracle Cloud Free Tier (A1 Flex, arm64, ap-mumbai-1).
- Prometheus + Grafana observability stack (monitoring profile).
- OpenTelemetry instrumentation on the backend.
- GitHub Actions CI skeleton.
- Comprehensive test suite: 65 tests covering auth, RBAC, tenant isolation, OEE engine, and health checks.

---

[Unreleased]: https://github.com/heyjishh/GreyHook-MES/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/heyjishh/GreyHook-MES/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/heyjishh/GreyHook-MES/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/heyjishh/GreyHook-MES/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/heyjishh/GreyHook-MES/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/heyjishh/GreyHook-MES/releases/tag/v0.1.0
