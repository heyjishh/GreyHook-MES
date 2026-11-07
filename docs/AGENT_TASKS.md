# Agent Tasks — GreyHook MES

**Format**: Each task has an ID, owner, objective, inputs, deliverables, acceptance criteria, and status.  
**Statuses**: BACKLOG | READY | IN_PROGRESS | REVIEW | BLOCKED | DONE

---

## FIO-001 — Product vision and PRD

| Field | Value |
|-------|-------|
| **Owner** | Agent 1 (Product & Manufacturing Architect) |
| **Status** | READY |
| **Dependency** | None |
| **Reviewer** | Founder |

**Objective**: Produce a complete MVP PRD with user stories, acceptance criteria, and factory personas.

**Deliverables**:
- `docs/PRODUCT_VISION.md` (drafted — review and expand)
- `docs/product/PRD.md`
- `docs/product/USER_STORIES.md`

**Acceptance criteria**:
- At least 4 user personas defined (admin, manager, supervisor, operator).
- At least 15 user stories with acceptance criteria.
- All unvalidated assumptions labeled `[ASSUMPTION]`.
- Pilot success metrics defined.

---

## FIO-002 — Manufacturing and OEE definitions

| Field | Value |
|-------|-------|
| **Owner** | Agent 1 (Product & Manufacturing Architect) |
| **Status** | READY |
| **Dependency** | None |
| **Reviewer** | Manufacturing domain expert + Founder |

**Objective**: Define OEE formula, downtime taxonomy, machine states, and shift model.

**Deliverables**:
- `docs/manufacturing/OEE_RULES.md` (drafted — review and expand)
- `docs/manufacturing/DOWNTIME_TAXONOMY.md` (drafted — review and expand)

**Acceptance criteria**:
- OEE formula references at least one standard (ISO 22400 or SEMI E10).
- All downtime categories have codes and descriptions.
- Machine state model explicitly mapped to OEE time categories.
- Edge cases documented: midnight-spanning shift, all-fault shift, zero planned qty.

---

## FIO-003 — System architecture review

| Field | Value |
|-------|-------|
| **Owner** | Agent 2 (Platform & Edge Engineer) + Orchestrator |
| **Status** | READY |
| **Dependency** | FIO-001, FIO-002 |
| **Reviewer** | Founder |

**Objective**: Produce ADRs for all major technology choices and get founder approval on architecture.

**Deliverables**:
- `docs/architecture/SYSTEM_ARCHITECTURE.md` (drafted — review)
- `docs/architecture/DECISIONS.md` (drafted — review and add remaining ADRs)

**Remaining ADRs needed**:
- ADR-009: AWS deployment topology (ECS Fargate vs EKS vs EC2)
- ADR-010: OPC UA library selection for Rust edge gateway
- ADR-011: Temporal Cloud vs self-hosted Temporal

**Acceptance criteria**:
- All 11 ADRs complete with rationale and alternatives considered.
- Founder has reviewed and approved architecture.

---

## FIO-004 — API and database contracts

| Field | Value |
|-------|-------|
| **Owner** | Agent 2 (Platform & Edge Engineer) |
| **Status** | READY |
| **Dependency** | FIO-003 |
| **Reviewer** | Agent 3 + Founder |

**Objective**: Freeze the API contract and database schema that all agents will implement against.

**Deliverables**:
- `docs/architecture/API_CONTRACT.md` (drafted — expand and freeze)
- `docs/architecture/DATABASE_SCHEMA.md` (drafted — expand and freeze)

**Acceptance criteria**:
- All MVP endpoints documented with request/response schemas.
- All database tables documented with indexes and constraints.
- Kafka topic schemas documented.
- Contract version incremented and change log added.
- Both Agent 3 and Founder have reviewed and approved.

---

## FIO-005 — Frontend design system and wireframes

| Field | Value |
|-------|-------|
| **Owner** | Agent 3 (Frontend & AI Engineer) |
| **Status** | READY |
| **Dependency** | FIO-001 |
| **Reviewer** | Founder |

**Objective**: Define the visual design system and produce wireframes for all MVP dashboard views.

**Deliverables**:
- Design token definitions (colors, typography, spacing)
- Wireframes: factory overview, machine detail, OEE dashboard, downtime Pareto, AI investigation
- Component inventory (which shadcn/ui components, which custom)
- Next.js App Router route structure

**Acceptance criteria**:
- Wireframes cover all 5 MVP views.
- Design system is distinct — no generic AI aesthetic (no Inter font, no purple gradients).
- Route structure agreed before implementation.
- Founder has reviewed and approved visual direction.

---

## FIO-006 — Backend foundation and auth (Week 3–4)

| Field | Value |
|-------|-------|
| **Owner** | Agent 2 |
| **Status** | BACKLOG |
| **Dependency** | FIO-004 (contracts frozen) |

**Objective**: Implement FastAPI backend with auth, tenant isolation, and core models.

**Deliverables**: FastAPI app, Alembic migrations, auth endpoints, org/factory/line/machine CRUD APIs, tests.

---

## FIO-007 — Factory simulator (Week 3–4)

| Field | Value |
|-------|-------|
| **Owner** | Agent 2 |
| **Status** | BACKLOG |
| **Dependency** | FIO-004 |

**Objective**: Rust binary that simulates 3–5 automotive-component factory machines via MQTT and Kafka.

**Deliverables**: `/simulator/` Rust binary, Docker image, seed configuration for demo org.

---

## FIO-008 — Rust edge gateway + telemetry processor (Week 5–6)

| Field | Value |
|-------|-------|
| **Owner** | Agent 2 |
| **Status** | BACKLOG |
| **Dependency** | FIO-006, FIO-007 |

**Objective**: Edge gateway (MQTT subscriber + OPC UA reader → Kafka producer) and telemetry processor (dedup, normalize → PostgreSQL).

---

## FIO-009 — Factory dashboard (Week 3–4)

| Field | Value |
|-------|-------|
| **Owner** | Agent 3 |
| **Status** | BACKLOG |
| **Dependency** | FIO-005, FIO-006 |

**Objective**: Next.js dashboard with machine status, production overview, and live SSE updates.

---

## FIO-010 — OEE and downtime analytics (Week 7–8)

| Field | Value |
|-------|-------|
| **Owner** | Agent 2 |
| **Status** | BACKLOG |
| **Dependency** | FIO-008 |

**Objective**: OEE calculation service, Temporal workflows for shift aggregation, analytics APIs.

---

## FIO-011 — OEE dashboards (Week 7–8)

| Field | Value |
|-------|-------|
| **Owner** | Agent 3 |
| **Status** | BACKLOG |
| **Dependency** | FIO-010 |

---

## FIO-012 — AI query tools (Week 9–10)

| Field | Value |
|-------|-------|
| **Owner** | Agent 3 |
| **Status** | BACKLOG |
| **Dependency** | FIO-010, FIO-006 |

---

## FIO-013 — AI root-cause investigation (Week 9–10)

| Field | Value |
|-------|-------|
| **Owner** | Agent 3 |
| **Status** | BACKLOG |
| **Dependency** | FIO-012 |

---

## FIO-014 — Security and integration testing (Week 11–12)

| Field | Value |
|-------|-------|
| **Owner** | Orchestrator + Reviewers |
| **Status** | BACKLOG |
| **Dependency** | FIO-008 through FIO-013 |

---

## FIO-015 — Pilot deployment (Week 11–12)

| Field | Value |
|-------|-------|
| **Owner** | All agents |
| **Status** | BACKLOG |
| **Dependency** | FIO-014 |
