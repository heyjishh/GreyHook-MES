# System Architecture — GreyHook MES

**Version**: 0.1  
**Status**: Draft — requires founder approval before implementation begins  
**Date**: 2026-11-04

## Architecture overview

```
Factory Floor
─────────────────────────────────────────────────────────────
  PLCs / Sensors / HMI
       │ OPC UA read (polling)
       │ MQTT publish (event-driven)
       ▼
  [Rust Edge Gateway]  ──── local disk buffer (offline) ────►
       │
       │ Kafka produce → mes.telemetry.raw
       ▼
─────────────────────────────────────────────────────────────
Cloud Platform (AWS)
─────────────────────────────────────────────────────────────
  Kafka / Redpanda
  mes.telemetry.raw
       │
       ▼
  [Rust Telemetry Processor]
  - Deduplication (event_id)
  - Timestamp normalization (UTC)
  - Schema validation
  - Produce → mes.telemetry.normalized

  mes.telemetry.normalized
       │
       ▼
  [Python Ingestion Worker]
  - Write to PostgreSQL/TimescaleDB
  - Trigger Temporal signals

  [Temporal Workflow Engine]
  - Production order lifecycle
  - Downtime state machine
  - Shift aggregation
  - AI investigation workflows

  [Python FastAPI Backend]
  - REST API for frontend
  - Business logic and analytics
  - OEE calculation service
  - AI investigation service
  - Auth (JWT) + RBAC

  [Valkey / Redis-compatible]
  - API response caching
  - Session storage
  - Rate limiting

  [PostgreSQL 16 + TimescaleDB]
  - Organizations, factories, lines, machines
  - Production orders and events
  - Downtime events
  - OEE aggregates (hypertable)
  - AI investigation results

  [Next.js 15 Frontend]
  - Factory dashboard
  - Machine status (SSE live updates)
  - OEE and production analytics
  - AI investigation UI

  [AI Investigation Service]
  - Model-agnostic LLM adapter
  - Structured tool calling
  - Evidence retrieval
  - Evaluation dataset
─────────────────────────────────────────────────────────────
```

## Deployment topology

```
AWS Region (ap-south-1 — Mumbai)

  VPC
  ├── Public subnet
  │   └── ALB (HTTPS termination)
  │
  ├── Private subnet — application
  │   ├── ECS Fargate: FastAPI backend
  │   ├── ECS Fargate: Next.js frontend
  │   ├── ECS Fargate: Telemetry processor (Rust)
  │   ├── ECS Fargate: Python ingestion worker
  │   └── ECS Fargate: Temporal worker
  │
  ├── Private subnet — data
  │   ├── RDS PostgreSQL 16 + TimescaleDB extension
  │   ├── ElastiCache Valkey (Redis-compatible)
  │   └── MSK (Kafka) or self-hosted Redpanda
  │
  └── Temporal Cloud or self-hosted Temporal server

  Factory edge (on-premises)
  └── Docker container: Rust edge gateway
      (outbound HTTPS/WSS to Kafka bootstrap)
```

## Key architectural decisions

1. **Modular monolith** for the backend API: single FastAPI application with clear module boundaries.
   Not microservices. Scale out as single units initially.

2. **Rust for edge and telemetry**: edge gateway and telemetry processor are Rust binaries for
   deterministic latency, low memory footprint, and safe concurrency.

3. **Kafka as the event backbone**: all telemetry flows through Kafka.
   MQTT is edge transport only; Kafka is internal platform event log.

4. **Temporal for stateful workflows**: production order lifecycle, downtime state machines,
   and AI investigation runs are Temporal workflows — not ad-hoc background jobs.

5. **TimescaleDB for time-series**: telemetry and OEE aggregate tables use TimescaleDB
   hypertables with automatic partitioning by time.

6. **Valkey (not Redis)**: fully open-source Redis-compatible store. Drop-in replacement.

7. **Model-agnostic AI adapter**: LLM provider is configured via environment variable.
   No hardcoded dependency on a single provider.

8. **Read-only machine integration**: edge gateway never writes to PLC registers.
   AI cannot issue control commands.

## Data flow — telemetry

```
Machine event (OPC UA / MQTT)
  → Rust edge gateway (validate, enrich with machine_id, gateway_id)
  → Kafka: mes.telemetry.raw
  → Rust telemetry processor (dedup by event_id, normalize timestamps)
  → Kafka: mes.telemetry.normalized
  → Python ingestion worker (write to TimescaleDB, signal Temporal)
  → Temporal: update production order, downtime state machine
  → PostgreSQL: OEE aggregates updated
  → FastAPI: serve via REST to Next.js
```

## Security boundaries

- Edge gateway: outbound-only TLS connection to Kafka bootstrap endpoint. No inbound ports.
- Backend API: no direct database access from frontend. All queries via authenticated API.
- AI service: accesses only pre-approved parameterized query functions. No raw SQL from LLM.
- Tenant isolation: every PostgreSQL query includes `organization_id` filter enforced at service layer.
- Secrets: AWS Secrets Manager in production. `.env` file in development (never committed).
