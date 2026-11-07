# Architecture Decision Records — GreyHook MES

Format: Status = [PROPOSED | ACCEPTED | SUPERSEDED | REJECTED]

---

## ADR-001: Rust for Edge Gateway and Telemetry Processor

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: Use Rust for the edge gateway and telemetry processor binaries.

**Rationale**:
- Edge gateway must run reliably on constrained factory-floor hardware with deterministic latency.
- Telemetry processor handles high-frequency machine events; allocation-free hot paths matter.
- Rust's ownership model eliminates data races without a GC pause.
- `rumqttc` and `opcua` crates provide production-ready industrial protocol support.
- Single binary deployment, no runtime dependency on Python interpreter at the edge.

**Alternatives considered**:
- Go: Good but no comparable OPC UA library maturity.
- Python: Too slow for high-frequency telemetry; GIL complicates async concurrency.

---

## ADR-002: Kafka as Internal Event Backbone

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: All telemetry flows through Kafka internally. MQTT is edge transport only.

**Rationale**:
- Kafka provides durable, replayable event log — essential for telemetry accounting and audit.
- Consumer groups allow multiple processors (dedup, analytics, alerting) to subscribe independently.
- Redpanda is Kafka-compatible with no ZooKeeper dependency, easier for local dev.
- MQTT publish confirmation does not guarantee durability. Kafka consumer offsets do.

**Alternatives considered**:
- NATS JetStream: simpler but less mature ecosystem for manufacturing telemetry volumes.
- Direct HTTP push: no replay capability, tight coupling.

---

## ADR-003: Temporal for Stateful Workflow Orchestration

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: Use Temporal for production order lifecycle, downtime state machines, and AI investigation runs.

**Rationale**:
- Manufacturing workflows are long-running, stateful, and must survive process restarts.
- Temporal provides durable execution: a workflow that crashes mid-step resumes from where it stopped.
- Production order: scheduled → running → paused → completed is a natural Temporal workflow.
- AI investigations with multi-step tool calling benefit from Temporal's retry and timeout semantics.
- Python SDK for backend workers; potential Rust SDK for edge workers later.

**Alternatives considered**:
- Celery: no durable execution. Task loss on worker restart.
- Custom state machine in PostgreSQL: works but requires reinventing retry, timeout, and visibility.

---

## ADR-004: PostgreSQL + TimescaleDB (not InfluxDB or ClickHouse)

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: Use PostgreSQL 16 with TimescaleDB extension for all storage including time-series.

**Rationale**:
- Single database engine reduces operational complexity.
- TimescaleDB hypertables handle time-series workloads with automatic chunking.
- Relational joins between telemetry and production orders are native.
- SQLAlchemy + Alembic work seamlessly.
- If time-series volume outgrows TimescaleDB, migration to ClickHouse is scoped but deferred.

**Alternatives considered**:
- InfluxDB: no relational joins; separate write and query path.
- ClickHouse: excellent for analytics but separate from operational data.

---

## ADR-005: Valkey (not Redis)

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: Use Valkey for caching, session storage, and rate limiting.

**Rationale**:
- Valkey is a Linux Foundation open-source Redis fork with BSD-3 license.
- 100% protocol-compatible with Redis clients.
- Avoids Redis licensing uncertainty (SSPL).
- Identical API surface; no code changes from Redis.

---

## ADR-006: Next.js 15 (not React + Vite)

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: Use Next.js 15 with App Router for the frontend.

**Rationale**:
- Server-side rendering improves initial dashboard load time.
- App Router provides layouts, nested routes, and streaming that suit a multi-view factory dashboard.
- Next.js API routes serve as a BFF layer for auth and SSE proxying.
- Large community, excellent TypeScript support.

---

## ADR-007: Model-Agnostic LLM Adapter

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: AI service uses an adapter pattern. LLM provider configurable via environment variable.

**Rationale**:
- Avoid lock-in to a single LLM provider for a production manufacturing system.
- Enables cost/performance tradeoff decisions over time.
- Allows on-premise/private model deployment if factory data privacy requires it.

**Initial implementation**: Claude (Anthropic) as default. OpenAI as secondary.

---

## ADR-008: Redpanda for Local Development Kafka

**Status**: ACCEPTED  
**Date**: 2026-11-04  
**Decision**: Use Redpanda in Docker Compose for local development. AWS MSK in production.

**Rationale**:
- Redpanda is Kafka-compatible, single binary, no ZooKeeper.
- Starts in seconds in Docker Compose vs Kafka's multi-container setup.
- Production uses AWS MSK (Kafka) for managed operations, same protocol.

---

## ADR-009: AWS Deployment Topology — ECS Fargate vs EKS vs EC2

**Status**: ACCEPTED
**Date**: 2026-11-04
**Decision**: Use AWS ECS Fargate for all application services in the MVP.

**Rationale**:
- ECS Fargate is fully serverless: no EC2 instances to provision, patch, or right-size. This significantly reduces the operational burden on a small founding team.
- Task definitions are simple to write and version-control. Deployment pipelines (GitHub Actions → ECR → ECS) are well-understood and have first-class AWS CDK and Terraform support.
- Fargate costs at MVP volume (1 factory, 5 machines, low request rate) are low. A single Fargate task for the FastAPI backend and one for the Rust telemetry processor will cost under $50/month combined at the expected throughput.
- ap-south-1 (Mumbai) has full Fargate availability and is the correct region for an India-first product — data residency is satisfied.
- ECS service discovery and ALB target group integration handles load balancing without requiring a full mesh or ingress controller.
- Path to scale: ECS supports auto-scaling on CPU/memory metrics. At 10+ factories with higher concurrent load, horizontal scale-out is a configuration change, not an architectural change. If container orchestration complexity warrants it at scale, ECS can be migrated to EKS with the same container images.

**Alternatives considered**:
- **EKS (Kubernetes)**: Provides more sophisticated scheduling, Helm ecosystem, and service mesh options. Rejected for MVP because the operational overhead of running and upgrading a Kubernetes control plane (even managed) is disproportionate for 1 factory and 5 machines. A team of 2–3 engineers should not be managing cluster upgrades. Reconsider at 10+ factories or if multi-tenancy isolation requirements harden.
- **EC2 (self-managed)**: Maximum control but requires patching, AMI management, and capacity planning. No benefit over Fargate at this scale. Rejected entirely.
- **AWS Lambda + API Gateway**: Insufficient for FastAPI's connection-pooled database access and SSE streaming. Temporal worker processes require long-lived connections. Not viable.

**Migration path note**: If Kubernetes primitives (custom controllers, complex scheduling, GPU nodes for on-premise AI inference) become necessary post-pilot, ECS task definitions translate to Kubernetes manifests directly. The same ECR images, the same VPC topology. Migration is a week of work, not a rearchitecture.

---

## ADR-010: OPC UA Library for Rust Edge Gateway

**Status**: ACCEPTED
**Date**: 2026-11-04
**Decision**: Use the `opcua` crate (opcua-rs) for OPC UA connectivity in the Rust edge gateway.

**Rationale**:
- The `opcua` crate (`opcua` on crates.io, maintained by locka99) is the most mature pure-Rust OPC UA implementation available. It implements OPC UA Part 4 (Services), Part 6 (Mappings), and security modes up to and including SecurityMode SignAndEncrypt with the Basic256Sha256 security policy — the modes required by most industrial PLC environments.
- The crate supports asynchronous operation with tokio, which is the async runtime chosen for the edge gateway. All subscription callbacks and monitored item notifications are async-compatible.
- The crate supports both client and server roles. For the edge gateway, only the client role is needed (read + subscribe to OPC UA nodes on the PLC).
- Monitored item subscriptions (the OPC UA push model) are supported, enabling event-driven data collection rather than polling — this reduces network load and aligns with the architecture goal of event-driven telemetry.
- The library is actively maintained (recent commits as of early 2026) and has documentation for the subscription model, certificate management, and session reconnect.
- Pure Rust with no C dependencies avoids cross-compilation complexity for factory-floor embedded targets (ARM Linux gateways common in Indian SME settings).

**Alternatives considered**:
- **open62541 via FFI (C library)**: open62541 is the most widely deployed OPC UA C library and is production-proven in industrial settings. However, wrapping it via Rust FFI (`bindgen`) introduces unsafe code blocks, complicates the build system (CMake dependency), and creates friction for cross-compilation to ARM targets. Rejected in favor of the pure-Rust approach for MVP; can be revisited if the `opcua` crate proves insufficient for a specific PLC model.
- **Python OPC UA bridge (asyncua / python-opcua)**: Running a Python sidecar process to handle OPC UA and forwarding events to the Rust gateway via a local socket or shared memory would add a process boundary, a Python runtime dependency on the factory-floor device, and an additional failure domain. Rejected — it contradicts the rationale for choosing Rust (single binary, no runtime dependencies).
- **Node OPCUA (JavaScript/Node.js)**: Well-maintained but requires Node.js at the edge. Same objections as Python bridge. Rejected.

**Implementation note**: Certificate management for SignAndEncrypt mode requires generating and storing a self-signed X.509 certificate for the edge gateway. The certificate must be accepted by the PLC's trust list. The edge gateway will generate a certificate on first startup and store it in a persistent volume. Certificate rotation is out of scope for MVP.

---

## ADR-011: Temporal Cloud vs Self-Hosted Temporal

**Status**: ACCEPTED
**Date**: 2026-11-04
**Decision**: Use Temporal Cloud for the MVP.

**Rationale**:
- Self-hosting Temporal requires running the Temporal server (a multi-component Go service), a dedicated PostgreSQL database for Temporal's own persistence, and an Elasticsearch cluster for workflow visibility queries. This is a substantial operational addition on top of the application stack already owned by a small team.
- For MVP at low workflow volume (1 factory, 5 machines, production orders and downtime events that execute at < 100 workflows/hour), Temporal Cloud cost is minimal. The free tier covers up to 100 GB of action storage and 25M actions/month — well above MVP needs. Paid consumption beyond that is billed per action, not per seat, keeping costs low during the pilot period.
- Temporal Cloud provides managed upgrades, built-in visibility UI (Temporal Web), and observability without additional infrastructure. The founding team avoids owning Temporal server availability, which is a critical dependency for production order state machine durability.
- Data residency: production workflow inputs and signals travel to Temporal Cloud. For an Indian SME manufacturing context in the MVP, the workflow inputs are order IDs and machine IDs (not PII or regulated data). The actual production counts and machine events remain in the organization's AWS PostgreSQL instance. [ASSUMPTION] This data boundary is acceptable for MVP pilot factories; re-evaluate if a factory's internal compliance policy prohibits workflow context leaving their cloud account.
- Temporal Cloud offers a namespace in `ap-southeast-1` (Singapore), which is the nearest available region to `ap-south-1` (Mumbai). Latency impact on workflow signal round-trips is acceptable for manufacturing workflow granularity (seconds-resolution events, not millisecond-latency control loops).

**Alternatives considered**:
- **Self-hosted Temporal on ECS**: Possible but requires running `temporalite` or the full Temporal server stack (temporal-server, temporal-ui, a separate PostgreSQL instance for Temporal, Elasticsearch for visibility). Adds 3–4 additional ECS services, another database instance, and operational responsibility for a system the team does not own. Rejected for MVP to maintain focus on the product.
- **Temporal self-hosted on the application PostgreSQL**: Temporal can be configured to use PostgreSQL without Elasticsearch (no advanced visibility). This reduces the dependency count but still requires running and upgrading the Temporal server process. Rejected — the saved cost does not justify the added operational surface for a 1-factory MVP.
- **Replace Temporal with a simpler queue-based state machine**: Using Celery or RQ with PostgreSQL-backed task state is simpler to operate but loses durable execution guarantees. If a worker crashes mid-production-order workflow, the state must be reconstructed from the database. This is feasible but requires reinventing exactly what Temporal provides. Rejected — the architecture decision (ADR-003) has already justified Temporal.

**Migration path note**: Moving from Temporal Cloud to self-hosted is straightforward: deploy the Temporal server stack, update the `TEMPORAL_ADDRESS` environment variable in the backend and worker services, and replay any in-progress workflows. This migration can be done without code changes. It should be considered at scale if data residency requirements harden or if workflow volume makes Cloud pricing uneconomical.
