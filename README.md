<div align="center">

# GreyHook MES

### Factory Intelligence OS

**Real-time production visibility · OEE measurement · AI-powered root-cause investigation**

Built for small and medium-sized manufacturing factories that run on instinct today and need data tomorrow — without the ₹5Cr enterprise MES price tag.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/heyjishh/GreyHook-MES)](https://github.com/heyjishh/GreyHook-MES/stargazers)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](http://129.154.235.118:3000)

</div>

---

## Table of Contents

- [What is GreyHook MES?](#what-is-greyhook-mes)
- [Problem](#problem)
- [Solution](#solution)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Multi-tenant Hierarchy](#multi-tenant-hierarchy)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Security](#security)
- [OCI / Cloud Deployment](#oci--cloud-deployment)
- [Development Guide](#development-guide)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)

---

## What is GreyHook MES?

GreyHook MES (Manufacturing Execution System) is a **Factory Intelligence OS** — an AI-native platform that gives factory supervisors and plant managers real-time visibility into what is happening on their shop floor, why production targets were missed, and what to do about it.

A factory supervisor opens their phone and immediately sees:

- Which machines are **running, idle, or faulted** right now
- How much production has been completed **vs the shift target**
- Where production time was **lost** today, and why
- An **AI-generated investigation**: evidence, hypothesis, recommended action — in plain language, not dashboards

One platform. Every industry. Plug-and-play from day one.

---

## Problem

Indian SME factories (₹5–200 Cr revenue, 10–500 employees) lose **20–40% of potential production capacity** to:

- Untracked machine downtime
- Poor shift handover (the outgoing shift takes the context home)
- Reactive maintenance (you find out the machine broke when production stops)
- No data to answer: *"Why did we miss today's target?"*

Enterprise MES solutions cost ₹50L–5Cr to deploy and need dedicated IT teams. Most factories use whiteboards, Excel, and intuition.

---

## Solution

GreyHook MES connects to factory machines via **OPC-UA and MQTT**, streams telemetry through a **Rust edge gateway**, processes it in real time, and surfaces it on a **Next.js dashboard** that works on a phone.

When something goes wrong, the **AI investigation engine** queries the production database, assembles evidence (downtime events, telemetry anomalies, shift patterns), and writes a root-cause hypothesis in plain language — in under 5 minutes, without training.

---

## Architecture

```
                        ┌─────────────────────────────────────────────┐
                        │               Browser (Next.js 15)          │
                        │  Machine grid · OEE gauges · AI panel       │
                        └─────────────────┬───────────────────────────┘
                                          │  REST / SSE
                        ┌─────────────────▼───────────────────────────┐
                        │           Backend API (FastAPI)             │
                        │  Auth · RBAC · Tenant isolation · OEE      │
                        └─────┬────────────────────┬──────────────────┘
                              │                    │
              ┌───────────────▼──────┐  ┌──────────▼──────────────┐
              │  PostgreSQL 16       │  │  Valkey (Redis-compat)  │
              │  + TimescaleDB       │  │  Session cache / KV     │
              └──────────────────────┘  └─────────────────────────┘
                              │
              ┌───────────────▼──────────────────────────────────────┐
              │                  Kafka (Redpanda)                    │
              │  mes.telemetry.raw · mes.telemetry.normalized        │
              │  mes.production.events · mes.downtime.events         │
              └────────┬────────────────────────┬────────────────────┘
                       │                        │
       ┌───────────────▼──────────┐  ┌──────────▼──────────────────┐
       │  Telemetry Processor     │  │  Temporal Workflow Engine   │
       │  (Rust)                  │  │  AI investigations · OEE   │
       │  Kafka consumer          │  │  aggregation workflows      │
       │  Dedup · Normalize · DB  │  └─────────────────────────────┘
       └──────────────────────────┘
                       ▲
       ┌───────────────┴──────────┐
       │  Edge Gateway (Rust)     │
       │  OPC-UA + MQTT ingestion │
       │  → Kafka publish         │
       └──────────────┬───────────┘
                      │
       ┌──────────────▼───────────┐
       │  Factory Floor           │
       │  PLCs · sensors · SCADA  │
       └──────────────────────────┘
```

**Data flow:**

1. Machines emit telemetry over OPC-UA or MQTT
2. The Rust edge gateway normalizes and publishes to Kafka topics
3. The Rust telemetry processor consumes from Kafka, deduplicates, and writes to TimescaleDB
4. Temporal workflows aggregate OEE, trigger investigations, handle retries
5. The FastAPI backend serves real-time data to the Next.js dashboard via REST and SSE
6. AI investigations pull structured production data and generate evidence-backed hypotheses

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 15 + TypeScript + Tailwind + shadcn/ui | Server components, type safety, fast iteration |
| **Charts** | Apache ECharts | High-performance time-series, OEE gauges |
| **Backend API** | Python + FastAPI + SQLAlchemy (async) | Async-first, Pydantic schemas, OpenAPI |
| **Edge gateway** | Rust (tokio, rumqttc, opcua crate) | Zero-overhead async, industrial protocol support |
| **Telemetry processor** | Rust (rdkafka, sqlx) | Throughput, low latency, single binary |
| **Workflow engine** | Temporal | Durable execution, retries, visibility |
| **Message streaming** | Kafka / Redpanda | High-throughput telemetry fan-out |
| **Cache / KV** | Valkey (Redis-compatible) | Session store, rate limiting |
| **Primary database** | PostgreSQL 16 + TimescaleDB | Relational + time-series in one, hypertables |
| **ORM / migrations** | SQLAlchemy async + Alembic | Type-safe queries, schema versioning |
| **Machine protocols** | OPC-UA + MQTT (Mosquitto) | Industry standard; covers 90% of PLCs |
| **Factory simulator** | Rust | Realistic multi-machine data for dev/demo |
| **Infrastructure** | Oracle Cloud / AWS + Terraform | Free Tier A1 for MVP; AWS for scale |
| **Containers** | Docker + Docker Compose | Reproducible local stack |
| **CI/CD** | GitHub Actions | Automated test + build |
| **Observability** | OpenTelemetry + Prometheus + Grafana | Traces, metrics, dashboards |

---

## Features

### Production visibility
- Real-time machine state grid (Running · Idle · Fault · Changeover · Maintenance)
- Shift production progress: actual vs planned, parts per hour
- Live OEE breakdown — Availability, Performance, Quality, Overall
- Downtime event log with category classification

### AI investigation
- Natural-language queries over production data: *"Why did Line 2 miss target last shift?"*
- Evidence assembly: telemetry anomalies, downtime patterns, shift comparison
- Root-cause hypothesis with confidence rating
- Recommended actions, not just observations

### Multi-tenant & multi-industry
- Full hierarchy: Organization → Business Units → Plants → Production Lines → Machines
- One deployment serves automotive, food processing, plastics, precision machining, and more
- Industry-specific module configuration — only show what's relevant
- Tenant isolation enforced at every query boundary

### Role-based access
| Role | What they see |
|---|---|
| **Operator** | Own line, own shift, downtime entry |
| **Supervisor** | All lines in their plant, shift handover |
| **Manager** | All plants, OEE analytics, AI investigations |
| **Admin** | Full org, user management, system config |

### Real-time streaming
- Server-Sent Events (SSE) for live machine state updates
- Authenticated SSE via short-lived query token (EventSource limitation workaround)
- Kafka-backed fan-out for high-frequency telemetry

### Observability
- OpenTelemetry traces on all backend routes
- Prometheus metrics: request latency, Kafka consumer lag, DB query time
- Grafana dashboards for production ops
- Structured JSON logging with request correlation IDs

---

## Multi-tenant Hierarchy

```
Organization (Company)
├── Business Unit: Alloy Wheels
│   ├── Plant: Pune North
│   │   ├── Line: Casting Line 1
│   │   │   ├── Machine: Die Cast Press #1
│   │   │   ├── Machine: Trimming Robot #2
│   │   │   └── Machine: CNC Lathe #3
│   │   └── Line: Casting Line 2
│   │       └── ...
│   └── Plant: Pune South
│       └── ...
├── Business Unit: Seating
│   └── Plant: Nashik
│       └── ...
└── Business Unit: Lighting
    └── ...
```

The same platform works for:
- Automotive component manufacturers
- Food & beverage processing
- Plastic injection moulding
- Precision machining (CNC)
- Pharma & FMCG packaging
- Any factory with PLCs, sensors, or SCADA

---

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose v2
- Git

### 1. Clone

```bash
git clone https://github.com/heyjishh/GreyHook-MES.git
cd GreyHook-MES
```

### 2. Configure

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```env
POSTGRES_PASSWORD=your-strong-password
JWT_SECRET=your-32-char-random-string   # openssl rand -hex 32
```

### 3. Start the stack

```bash
docker compose up -d
```

This starts: PostgreSQL (TimescaleDB), Valkey, Redpanda, Mosquitto, the backend API, and the Next.js dashboard.

### 4. Open the dashboard

```
http://localhost:3000
```

Default seed credentials (development only):

| Email | Password | Role |
|---|---|---|
| admin@demo.com | demo1234 | Admin |
| manager@demo.com | demo1234 | Manager |
| supervisor@demo.com | demo1234 | Supervisor |

### 5. Run the factory simulator

```bash
docker compose --profile simulate up -d
```

This generates realistic machine telemetry: production runs, downtime events, speed variations — full OEE story without real hardware.

### 6. Enable monitoring (optional)

```bash
docker compose --profile monitoring up -d
```

Opens Grafana at `http://localhost:3001`, Redpanda Console at `http://localhost:8080`, Temporal UI at `http://localhost:8088`.

---

## Configuration

All configuration is environment-driven. Copy `.env.example` to `.env`.

### Required

| Variable | Description | Example |
|---|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL password for the `greyhook` user | `openssl rand -hex 16` |
| `JWT_SECRET` | JWT signing key — ≥ 32 characters | `openssl rand -hex 32` |

### Security (production)

| Variable | Description | Default |
|---|---|---|
| `ENVIRONMENT` | Set to `production` to enable startup secret validation | `development` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:3000` (dev) / none (prod) |

### LLM (AI investigations)

| Variable | Description |
|---|---|
| `LLM_PROVIDER` | `claude` (default) or `openai` |
| `ANTHROPIC_API_KEY` | Required when `LLM_PROVIDER=claude` |
| `OPENAI_API_KEY` | Required when `LLM_PROVIDER=openai` |

### Observability (optional)

| Variable | Description |
|---|---|
| `GRAFANA_PASSWORD` | Grafana admin password (monitoring profile) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector endpoint |

### Edge / simulator

| Variable | Description | Default |
|---|---|---|
| `ORG_ID` | Organization UUID (must match DB seed) | `00000000-…-000001` |
| `FACTORY_ID` | Factory UUID (must match DB seed) | `00000000-…-000001` |
| `GATEWAY_ID` | Edge gateway identifier | `edge-gateway-01` |
| `SIM_SPEED_FACTOR` | Simulator speed multiplier | `1.0` |

---

## API Reference

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/docs` (Swagger UI)

### Authentication

```
POST /auth/login          Login, get access + refresh tokens
POST /auth/refresh        Refresh access token
POST /auth/logout         Invalidate refresh token
GET  /auth/me             Current user info
```

All other endpoints require `Authorization: Bearer <token>`.

### Health

```
GET  /health              Liveness — {"status": "ok", "version": "0.1.0"}
GET  /health/ready        Readiness — checks DB, Kafka, Valkey; returns 503 if any fail
```

### Factories & Machines

```
GET  /factories                       List factories for current org
POST /factories                       Create factory (admin)
GET  /factories/{id}                  Get factory detail
GET  /factories/{id}/machines         List machines
POST /factories/{id}/machines         Add machine (admin)
GET  /machines/{id}                   Machine detail + current state
GET  /machines/{id}/telemetry         Telemetry time-series
```

### Production

```
GET  /production/runs                 List production runs
POST /production/runs                 Start a production run
PATCH /production/runs/{id}           Update run (actual count, status)
GET  /production/runs/{id}            Run detail
```

### OEE

```
GET  /oee?factory_id=&start=&end=     OEE for a time range
GET  /oee/machines/{id}               Per-machine OEE breakdown
GET  /oee/trends                      OEE trend data for charting
```

### Downtime

```
GET  /downtime                        Downtime events (filterable)
POST /downtime                        Log a downtime event
PATCH /downtime/{id}                  Update / close a downtime event
GET  /downtime/categories             Taxonomy of downtime categories
```

### AI

```
POST /ai/query                        Natural language query
POST /ai/investigate                  Start root-cause investigation (async)
GET  /ai/investigations/{id}          Poll investigation status + result
```

### Real-time (SSE)

```
GET  /sse/machines?token=<short-token>    Machine state stream
GET  /sse/factory/{id}?token=<token>      Factory-level event stream
```

SSE tokens are short-lived (5 min) and org-scoped. Obtain via `POST /auth/sse-token`.

---

## Security

See [SECURITY.md](SECURITY.md) for the full policy and responsible disclosure contact.

### Controls

| Control | Implementation |
|---|---|
| **Authentication** | JWT Bearer (access 15 min · refresh 7 days) |
| **Authorization** | Server-side RBAC via FastAPI `Depends()` — not UI-only |
| **Tenant isolation** | `organization_id` scoping at every query |
| **Audit log** | All `POST/PUT/PATCH/DELETE` written to `audit_log` with user, org, IP, request ID |
| **CORS** | Env-driven; production defaults to no origins |
| **Secret validation** | Startup rejects weak `JWT_SECRET` / `POSTGRES_PASSWORD` in production |
| **SSE auth** | Query-param token (required, org-scoped) — necessary because `EventSource` can't set custom headers |
| **Input validation** | Pydantic v2 at all API boundaries |
| **SQL** | SQLAlchemy parameterized queries only; no raw SQL from user input |

### Production hardening checklist

Before exposing to any network:

- [ ] `JWT_SECRET` — `openssl rand -hex 32`
- [ ] `POSTGRES_PASSWORD` — not `devpassword` or `changeme`
- [ ] `ENVIRONMENT=production` — enables startup validation of the above
- [ ] `CORS_ORIGINS` — set to your frontend origin(s)
- [ ] `GRAFANA_PASSWORD` — change from default
- [ ] Ports `8000` (backend) and `3001` (Grafana) not publicly exposed — front-proxy only
- [ ] Kafka/Redpanda ports (`9092`, `19092`) internal only
- [ ] OPC-UA / MQTT edge ports not reachable from untrusted networks

---

## OCI / Cloud Deployment

Terraform for Oracle Cloud Free Tier (A1 Flex, arm64, ap-mumbai-1) is in `infra/terraform-oci/`.

**Free Tier allocation:** 4 OCPUs · 24 GB RAM · 200 GB boot volume — always free.

> **Note:** A1 Flex capacity in Mumbai is frequently exhausted. The deploy script retries automatically every 5 minutes until capacity is available. This can take 30–90 minutes on the first attempt.

### Steps

```bash
cd infra/terraform-oci

# 1. Set up OCI API key auth (~/.oci/config)
#    See: https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm

# 2. Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with tenancy_ocid, user_ocid, fingerprint, etc.

# 3. Deploy
terraform init
terraform apply
```

Terraform provisions: VCN, internet gateway, security list (ports 22/80/443/3000), public subnet, A1 Flex instance with cloud-init.

Cloud-init installs Docker, Nginx (reverse proxy on port 80 → 3000), UFW, and creates `/opt/greyhook/`.

### Post-provision: deploy the app

```bash
# Get the public IP from Terraform output
terraform output instance_public_ip

# SSH in
ssh -i greyhook_ssh_key.pem ubuntu@<ip>

# Build and start
cd /opt/greyhook
./deploy-app.sh
```

The app will be available at `http://<ip>:3000` (and port 80 via Nginx).

### AWS (production scale)

Terraform for AWS (ECS Fargate + RDS Aurora + MSK) is in `infra/terraform/`. Used for production pilot deployments.

---

## Development Guide

### Local stack

```bash
docker compose up -d           # Start all services
docker compose logs -f backend # Tail backend logs
docker compose restart backend # Apply backend code changes
```

### Backend (Python / FastAPI)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# Run with auto-reload
uvicorn app.main:app --reload --port 8000

# Tests
pytest                         # All 65 tests
pytest tests/test_auth.py -v  # Single module
pytest -k "oee" -v             # Keyword filter
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev        # Dev server on :3000
npm run build      # Production build
npm run type-check # TypeScript check
```

### Edge gateway (Rust)

```bash
cd edge
cargo build
cargo test
MQTT_BROKER_URL=mqtt://localhost:1883 cargo run
```

### Telemetry processor (Rust)

```bash
cd telemetry-processor
cargo build
cargo test
KAFKA_BROKERS=localhost:19092 DATABASE_URL=postgresql://... cargo run
```

### Database migrations

```bash
cd backend
alembic upgrade head           # Apply all migrations
alembic revision --autogenerate -m "describe change"  # New migration
alembic downgrade -1           # Roll back one step
```

### Running tests

```bash
# Backend (requires running PostgreSQL)
cd backend && pytest

# Or with Docker (no local Python needed)
docker compose run --rm backend pytest
```

---

## Project Structure

```
GreyHook-MES/
├── backend/                    Python / FastAPI backend
│   ├── app/
│   │   ├── api/v1/            Route handlers (auth, factories, machines, OEE, AI, SSE, …)
│   │   ├── core/              Config, security, database, audit middleware, exceptions
│   │   ├── models/            SQLAlchemy ORM models
│   │   ├── schemas/           Pydantic request/response schemas
│   │   ├── services/          OEE calculator, business logic
│   │   └── workflows/         Temporal workflow definitions
│   ├── migrations/            Alembic migration scripts
│   └── tests/                 65 pytest tests
│
├── frontend/                   Next.js 15 dashboard
│   └── src/
│       ├── app/               App Router pages (dashboard, admin, login)
│       ├── components/        UI components (machine grid, OEE gauge, sidebar)
│       ├── hooks/             Data-fetching hooks
│       ├── lib/               API client, SSE client, mock data
│       ├── store/             Zustand stores (auth, factory, filter, industry)
│       └── types/             API TypeScript types
│
├── edge/                       Rust edge gateway (OPC-UA + MQTT → Kafka)
├── telemetry-processor/        Rust Kafka consumer → TimescaleDB
├── simulator/                  Rust factory data simulator
│
├── infra/
│   ├── docker/                Mosquitto, Temporal dynamic config
│   ├── monitoring/            Prometheus + Grafana provisioning
│   ├── terraform-oci/         Oracle Cloud Free Tier deployment
│   └── terraform/             AWS production deployment
│
├── docs/
│   ├── architecture/          System design, API contract, DB schema, decisions
│   ├── manufacturing/         OEE rules, downtime taxonomy
│   ├── product/               PRD, user stories, design system, pilot scope
│   ├── quality/               Acceptance criteria
│   └── security/              Security baseline
│
├── docker-compose.yml          Full local dev stack
├── .env.example                Environment variable reference
├── SECURITY.md                 Security policy + hardening checklist
├── CHANGELOG.md                Version history
└── Cargo.toml                  Rust workspace root
```

---

## Roadmap

### v0.2 — Security hardening (shipped)
- [x] Startup secret validation (rejects weak defaults in production)
- [x] Audit logging middleware (all mutating API calls recorded)
- [x] Configurable CORS (env-driven, no hardcoded origins)
- [x] SECURITY.md policy and hardening checklist

### v0.3 — Industrial connectivity
- [ ] Live OPC-UA integration with real PLC (Siemens S7, Allen-Bradley)
- [ ] MQTT authentication (username/password + TLS)
- [ ] Edge gateway reconnect / buffer-and-replay on network loss
- [ ] OPC-UA node discovery UI

### v0.4 — Production intelligence
- [ ] Shift handover report (auto-generated from last 8 hours)
- [ ] Downtime Pareto chart (automated ranking by frequency × duration)
- [ ] Planned vs actual production comparison with variance alerts
- [ ] Email / WhatsApp alerts on OEE threshold breach

### v0.5 — AI intelligence
- [ ] Multi-shift root-cause comparison
- [ ] Predictive maintenance signals from telemetry patterns
- [ ] Natural language report generation (PDF export)
- [ ] AI-driven scheduling recommendations

### v0.6 — Pilot readiness
- [ ] Mobile-first PWA (offline support for operator entry)
- [ ] ERP integration (Tally, SAP B1) for production orders
- [ ] White-labelling (factory-specific logo, theme)
- [ ] 21 CFR Part 11 / GAMP 5 audit trail (pharma)

---

## Contributing

1. Fork the repository
2. `cp .env.example .env` and fill in development values
3. `docker compose up -d`
4. Create a feature branch: `git checkout -b feature/my-feature`
5. Make your changes with tests
6. `cd backend && pytest` — all tests must pass
7. Open a pull request against `main`

Please read [SECURITY.md](SECURITY.md) before reporting security vulnerabilities.

---

## License

MIT © 2026 GreyHook

---

<div align="center">

**[Live Demo](http://129.154.235.118:3000)** · **[API Docs](http://129.154.235.118:8000/docs)** · **[Security Policy](SECURITY.md)** · **[Changelog](CHANGELOG.md)**

*Built for Indian SME factories. Designed to run on a free-tier VM and a supervisor's Android phone.*

</div>
