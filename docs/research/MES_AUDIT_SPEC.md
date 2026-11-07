# MES Competitive Audit Spec
# GreyHook Factory Intelligence OS — REA Analysis

## Purpose
Deep code-level audit of 7 open-source MES repositories to extract implementation patterns
for GreyHook MES (Indian SME factories; Rust edge + FastAPI backend + Next.js 15 + Kafka +
Temporal + TimescaleDB + AI via claude-sonnet-4-6).

## GreyHook Context (what we are building — benchmark everything against this)
- Edge gateway: Rust, outbound-only TLS, subscribes MQTT `factory/#`, publishes to Kafka
- Telemetry processor: Rust, Kafka consumer → TimescaleDB hypertable
- Backend API: Python 3.12 + FastAPI + Pydantic v2, JWT + Argon2id auth
- Multi-tenant: `organization_id` on every row; cross-org returns 404
- OEE: Availability × Performance × Quality, ISO 22400, [0,1] clamped
- Machine states: running / idle / fault / offline
- AI: Anthropic claude-sonnet-4-6, 10/org/hr rate limit, Temporal workflow, read-only
- Target users: Indian SME factories, supervisor/manager/admin roles

---

## Audit Dimensions

Each agent MUST report on these 8 dimensions with concrete evidence (file paths, code lines,
schema fields). Do not speculate; cite what you actually read.

### D1 · OEE Implementation
- Formula used (Avail × Perf × Quality)? ISO 22400 / SEMI E10 compliance?
- How is Availability computed (from machine state periods)?
- Performance: ideal_cycle_time concept? how calculated?
- Quality: good_qty, rejected_qty fields; where tracked?
- Clamping to [0,1]? Handling zero-denominators?
- Storage: timeseries table / hypertable? Per-shift? Per-hour?

### D2 · Machine State & Downtime
- State enum values and state machine transitions
- How is running-time vs downtime computed?
- Downtime record schema: planned/unplanned? category taxonomy?
- Event vs period model (state_periods table vs event log)?
- Duration calculation (ended_at - started_at or delta-time)?

### D3 · Device / Protocol Integration
- OPC-UA: client/server? security mode? subscription/poll?
- MQTT: topic structure? QoS? broker choice?
- Edge-to-cloud boundary: who does the protocol translation?
- Reconnection / backoff strategy
- Write-back safeguards (is the machine-write path guarded?)

### D4 · Data Model Design
- Entity hierarchy: factory → line → machine (or different)?
- Shift model: shift_date + start/end time? crossing midnight?
- Production order lifecycle states (enum)?
- Telemetry schema: machine_id, ts, metric_name, value or wide table?
- Multi-tenancy: row-level security / tenant_id column / separate DB?

### D5 · API & Real-time Design
- REST versioning strategy (/api/v1/)?
- WebSocket vs SSE for live machine status?
- Event envelope schema (event_type, source, ts, payload)?
- OpenAPI / schema-first approach?
- Rate limiting and auth (JWT, API keys, RBAC)?

### D6 · AI / MCP Integration
- MCP server: how many tools? what permissions?
- Tool function signatures for manufacturing data queries
- How is tenant isolation maintained in AI queries?
- LLM model choice and prompt engineering
- Audit trail for AI-generated actions

### D7 · Code Quality Signals
- Test coverage (unit + integration + e2e)
- CI/CD pipeline gates
- Alembic/migration discipline (down migrations?)
- Security antipatterns (default passwords, unguarded routes, bare SQL)
- Dependency freshness (last commit, Dependabot)

### D8 · GreyHook Adoption Score
Return a JSON object:
```json
{
  "adopt": ["pattern X — why it's better than what we have"],
  "avoid": ["antipattern Y — why it would hurt us"],
  "differentiate": ["gap Z — opportunity GreyHook should exploit"]
}
```

---

## Output Format

Return a single JSON object (not markdown prose) with this schema:

```json
{
  "repo": "owner/name",
  "summary": "one sentence",
  "d1_oee": { "formula": "", "storage": "", "clamped": true, "gaps": [] },
  "d2_downtime": { "state_enum": [], "model": "period|event|both", "schema_fields": [], "gaps": [] },
  "d3_device": { "protocols": [], "edge_arch": "", "write_guard": "", "gaps": [] },
  "d4_data_model": { "hierarchy": "", "shift_model": "", "order_states": [], "telemetry_schema": "", "tenancy": "" },
  "d5_api": { "versioning": "", "realtime": "", "envelope": "", "auth": "" },
  "d6_ai": { "mcp_tools": 0, "tenant_isolated": false, "audit_trail": false, "model": "", "gaps": [] },
  "d7_quality": { "tests": "", "ci": "", "migrations": "", "security_flags": [], "last_active": "" },
  "d8_adoption": { "adopt": [], "avoid": [], "differentiate": [] }
}
```

---

## Repos to Audit (7 targets)

| # | Repo | Priority | Known strength |
|---|------|----------|----------------|
| 1 | https://github.com/crbnos/carbon | HIGH | Most mature; MCP over oRPC; Postgres RLS |
| 2 | https://github.com/Mes-Open/OpenMes | HIGH | Native MQTT + OPC-UA sidecar; ISA-95 Level 3 |
| 3 | https://github.com/point85/mes-ai | HIGH | 13-protocol plugin system; WebSocket events |
| 4 | https://github.com/factorysemantics/factorysemantics-mes | HIGH | 95-tool MCP; ISO 22400 OEE; standards-driven |
| 5 | https://github.com/Virtual-Path/virtual-path-mes | MEDIUM | LLM+SPC+Kafka; .NET MQTT edge gateway |
| 6 | https://github.com/kuaigeyun/kuaigeyun-mes | MEDIUM | FastAPI+Postgres; full discrete-MES scope |
| 7 | https://github.com/iplus-framework/iPlusMES | LOW | OPC-UA native .NET; PLC drivers; 30+ installs |

Skipped (not full MES runtimes): plc-machine-vision (dormant demo), sap-dm-pod2-mcp-server
(SAP tooling), Awesome-MES (list), FactoryX (abandoned .NET skeleton).

---

## Per-Agent Instructions

You are a Haiku audit agent. Your ONLY job is to audit one repo deeply against this spec.

Steps:
1. Fetch the GitHub repo root README.
2. Fetch the directory tree for the backend/server source (look for models, schemas, routes,
   migrations, tests).
3. Read at minimum: the primary OEE/performance file, the machine-state/downtime model file,
   any device integration file, and 1–2 migration files.
4. Answer all 8 dimensions with file-path evidence.
5. Output the JSON schema above — nothing else, no markdown prose.

If a dimension is not implemented in this repo, set the value to null and add the gap to the
`gaps` array. Never fabricate evidence.

Repo to audit: [INJECT REPO URL HERE]
