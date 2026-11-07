# Changelog

All notable changes to GreyHook MES are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

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

[Unreleased]: https://github.com/heyjishh/GreyHook-MES/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/heyjishh/GreyHook-MES/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/heyjishh/GreyHook-MES/releases/tag/v0.1.0
