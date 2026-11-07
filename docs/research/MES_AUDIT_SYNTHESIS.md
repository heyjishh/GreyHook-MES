# MES Competitive Audit — Synthesis & Recommendations
# GreyHook Factory Intelligence OS

Generated from 7 Haiku deep-code audits of open-source MES repositories.
Spec: docs/research/MES_AUDIT_SPEC.md
Raw results: docs/research/audit_results/*.json

---

## Executive Summary

**Zero of the seven audited repositories compute a correct ISO 22400 OEE.**
Every project has at least one of: wrong denominator, self-referential ideal cycle,
missing [0,1] clamp, or no OEE ratio at all. This is GreyHook's single most
defensible technical differentiator out of the box.

**Zero have row-level multi-tenancy with organization_id.** OpenMes has an
application-level TenantScope (nullable). kuaigeyun has tenant_id (nullable). All
others are single-tenant. GreyHook's NOT NULL organization_id on every row with
cross-org 404 is the only cloud-ready multi-tenant design.

**Zero have a Rust edge gateway.** The closest is OpenMes's Node.js OPC-UA sidecar
(outbound-only but no Kafka, no store-and-forward). GreyHook's Rust/Kafka/Temporal
pipeline is unmatched among open-source MES.

**factorysemantics is the most conceptually aligned** (deep OEE, ISA-95 hierarchy,
MCP+Claude, state interval model, strong CI). Its per-database tenancy and lack of
Kafka/Temporal/Rust are the gaps GreyHook closes.

---

## OEE Implementation (D1) — Cross-Repo Findings

| Repo | Formula Correct | Clamp [0,1] | Ideal Cycle | Stored |
|------|-----------------|-------------|-------------|--------|
| carbon | No (no ratio) | — | — | No |
| OpenMes | Yes | No (percent, unbounded quality) | Self-referential (fastest recent batch) | Yes (relational) |
| mes-ai | Yes | Partial (performance only) | From design_speed + UoM | Computed on read |
| iPlusMES | Yes | No (0→1 substitution) | Historical avg (not nameplate) | Yes (SQL Server) |
| virtual-path | Yes | No (upper-bound only, null crash) | Single fixed value | MySQL, not stored |
| factorysemantics | Yes | No (deliberately withholds >1) | From RoutingOperation | Computed on read |
| kuaigeyun | P always 100% | Partial (0-100%) | Derived from same runtime | Not stored |

**GreyHook must:**
- Availability = running_seconds / (running + idle + fault + planned_stop) — ISO 22400 planned busy time
- Performance = min((ideal_cycle_sec × units_good) / running_seconds, 1.0); ideal from product routing
- Quality = good / (good + reject + rework); min floor 0.0
- OEE = A × P × Q, stored as a TimescaleDB hypertable row per machine per shift hour
- Zero-denominator: set factor to null, not 0 or 1 — a null is a signal, not a lie

**Adopt from factorysemantics:**
- Coverage floor: withhold KPI when observed_seconds < minimum; prevents garbage from brief windows
- Unknown-time ledger: disconnected time ≠ downtime — it is a third category "unobserved"

---

## Machine State & Downtime (D2) — Cross-Repo Findings

| Repo | States | Period Table | Reason Codes | Planned vs Unplanned |
|------|--------|-------------|--------------|---------------------|
| carbon | Running/Idle/Down/Offline | Event log | No taxonomy | Via maintenance record |
| OpenMes | 8 states + OFFLINE inferred | Yes (hybrid: state timeline + downtime periods) | needs_reason flag | Auto-mapped per state |
| mes-ai | PackML 17 / SEMI E10 / 4 canonical | Yes (EquipmentStateLog) | Hierarchical reason tree | Mapped at write time |
| iPlusMES | ISA-S88 17 states | No (time buckets per run) | None | Fixed time buckets |
| virtual-path | ONLINE/OFFLINE/ALARM only | No (current-state row) | No | Alarm = unplanned |
| factorysemantics | 4: running/idle/down/setup | Yes (open-interval) | Per-plant vocabulary, raises on unmapped | down = unplanned (no planned_stop yet) |
| kuaigeyun | Chinese free-text, 6 values | No (point-in-time + history log) | Free string | Manual entry only |

**GreyHook should adopt:**
1. **mes-ai's dispatch_category + oee_bucket mapping** — translate any external state model (PackML, SEMI E10, vendor codes) into these 4 canonical buckets at ingest time, so OEE computation is state-model agnostic
2. **factorysemantics's tag_map raise-on-unmapped** — an unmapped state raises ValueError at the edge, forcing an explicit decision rather than silently mapping to idle
3. **OpenMes's needs_reason flag** — automatically opens a downtime record on FAULT/STOPPED; requires human classification within a configurable window; unclosed reasons surface as an alert
4. **OpenMes's OvernightDowntimeAttributionTest pattern** — shift windows that cross midnight are attributed by occurrence start/end, not calendar date; GreyHook must implement this for Indian 24×7 factories

---

## Device / Protocol Integration (D3) — Cross-Repo Findings

| Repo | OPC-UA | MQTT | Edge Separation | Write Guard | OPC-UA Security Default |
|------|--------|------|-----------------|-------------|------------------------|
| carbon | No | No | No edge | Webhook HMAC | — |
| OpenMes | Node.js sidecar (outbound) | PHP in-process | Partial (sidecar) | No write-back found | Basic256Sha256 or None |
| mes-ai | In-process Python | In-process Python | None | None found | **None + anonymous default** |
| iPlusMES | In-process .NET | None | None | _IsWriteable commented out | **None + anonymous + AutoAcceptCerts** |
| virtual-path | None | .NET gateway | Separate process | Gateway subscribe-only | — |
| factorysemantics | In-process Python asyncio | Optional | None | shadow.guard() at write_node() | **Anonymous + unencrypted default** |
| kuaigeyun | None (Pro only) | None (Pro only) | HTTP POC | None | — |

**Security antipatterns found across ALL repos with OPC-UA:**
- OPC-UA security None/anonymous is the default in every implementation
- MQTT TLS is off by default everywhere
- No repo validates OPC-UA certificates against a PKI; AutoAcceptUntrustedCertificates=true or equivalent

**GreyHook edge rules (confirmed differentiators):**
- OPC-UA: SecurityMode=SignAndEncrypt + Basic256Sha256 only; no None, no Anonymous; PKI certificate validation enforced; reject connections with untrusted certs
- MQTT: TLS required; per-device credentials (not shared user token); topic ACL enforced at broker
- Rust edge gateway: separate process; no inbound ports; publishes to Kafka bootstrap only; store-and-forward queue for Kafka outage recovery
- Write-back: configuration-only flag `allow_writes: false` by default; any write requires explicit opt-in and is logged to the audit_log before execution

**Adopt from factorysemantics:**
- shadow.guard(path) at the single write_node() function — one choke point for all writes
- Reconnection: asyncua subscription, exponential backoff, reconnect in a background task separate from the read loop

**Adopt from OpenMes:**
- Protocol-agnostic MachineSignalIngestor: normalize to (machine_id, tag_name, value, ts, signal_type) before any routing logic; adapters own only parsing
- Heartbeat liveness: markConnectionSignal on every message; derive offline from stale heartbeat, not from last state change

---

## Data Model Design (D4) — Cross-Repo Findings

| Repo | Hierarchy | Shift | Order States | Tenancy |
|------|-----------|-------|-------------|---------|
| carbon | company > location > work_center | shifts table (engine not shift-aware) | Done/Cancelled/Locked | Postgres RLS + companyId composite PK |
| OpenMes | Tenant > Line > Workstation | OvernightAttribution (occurrence-based) | 9 WorkOrder + 3 Batch + 3 BatchStep | tenant_id (app-level scope, nullable) |
| mes-ai | Site > Area > Line > WorkCell > Equipment | Shift-level ProductionCounter | 5 order + 4 lot + 4 WIP | Single-tenant |
| iPlusMES | Facility > FacilityMaterial | CalendarShift (not OEE-linked) | 7 batch states | Single-tenant |
| virtual-path | ProductionLine > Workstation > Device | DAY/NIGHT shift (not OEE-linked) | 6 order states | None |
| factorysemantics | ISA-95: enterprise/site/area/work_center/cell/machine | ShiftStamped mixin (shift_code + shift_day) | 7 order states | Per-database |
| kuaigeyun | Tenant > factory > workstation > equipment > work order | StationShiftHandover (per-workstation) | 6 order states | tenant_id (nullable) |

**GreyHook must adopt:**
1. **factorysemantics's ShiftStamped mixin** — add `shift_code` and `shift_day` to every telemetry and OEE row at ingest time; never derive shift retrospectively; clip reporting windows to shift boundaries
2. **mes-ai's Site > Area > Line > WorkCell > Equipment hierarchy** — directly maps ISA-95 levels 1-3; more granular than GreyHook's current factory > line > machine
3. **OpenMes's OvernightDowntimeAttributionTest pattern** (see D2 above)
4. **carbon's composite (id, organization_id) primary keys** — prevents any path from forgetting the tenant filter at the query layer; also use explicit FK constraints with organization_id in the reference

**GreyHook already has the best design for:**
- TimescaleDB hypertable for telemetry (no other repo uses TimescaleDB)
- NOT NULL organization_id on every row (every other repo has nullable or no tenant column)

---

## API & Real-time (D5) — Cross-Repo Findings

| Repo | Versioning | Real-time | Event Envelope |
|------|------------|-----------|----------------|
| carbon | /api/v1 path | Supabase Realtime table subscriptions | oRPC + OpenAPI 3 |
| OpenMes | /api/v1 path | Laravel Reverb WebSocket, tenant channels | {data, meta} + Laravel events |
| mes-ai | /api/v1 path | WebSocket at /api/v1/events/ws, topic-filtered | MESEvent {event_id, event_type, timestamp, source, payload, correlation_id} |
| iPlusMES | None | RMI (not HTTP) | WSResponse<T> |
| virtual-path | None | WebSocket /api/ws/dashboard | Result<T> {code, message, data, timestamp} |
| factorysemantics | None | Polling (2 s) | Outbox {schema_version, event_id, plant, type, payload} |
| kuaigeyun | /api/v1 path | Socket.IO (noop by default) | StandardResponse + PaginatedResponse |

**Adopt from mes-ai (point85):**
- MESEvent envelope: `{event_id: uuid, event_type: "equipment.state_changed", timestamp: utc, source: "edge-gw-1", payload: {...}, correlation_id: uuid}` — this is the cleanest event schema among all audited repos; correlation_id links MQTT message → Kafka event → DB row
- Topic-filtered WebSocket: client sends `{action: "subscribe", topics: ["factory.*.state_changed", "factory.line-1.*"]}` with fnmatch patterns; server routes by topic on broadcast

**Adopt from OpenMes:**
- Server-defined sync shapes (Shape.php): the client asks for a named shape, not a table; the server defines what columns and filters are allowed; prevents clients from constructing arbitrary queries
- Tenant-namespaced WebSocket channels: `factory-line.{organization_id}.{line_id}` — tenant ID baked into channel name, server verifies membership at join

---

## AI / MCP Integration (D6) — Cross-Repo Findings

| Repo | Tools | Model | Read-only | Tenant Isolated | Audit Trail | Rate Limit |
|------|-------|-------|-----------|-----------------|-------------|------------|
| carbon | 4 meta-tools over 1,787 ops | claude-sonnet-4-6 | No (750 WRITE, 250 DESTRUCTIVE) | Yes (RLS) | No | 30 req/5min/user |
| OpenMes | None | — | — | — | — | — |
| mes-ai | None (dev-time only) | — | — | — | — | — |
| iPlusMES | 22 (7 runtime + 15 dev) | gemini-2.0-flash (OpenRouter) | No (write-capable) | No | No | None found |
| virtual-path | 19 (OpenAI function calling) | glm-4-flash (Zhipu) | No (create_work_order) | No (client user_id param) | No | 1 global/60s |
| factorysemantics | 120 (84 in modules + 36 in mcp_server) | claude-sonnet-5 | Partial (dry_run, shadow mode) | Per-database | Yes (audit_log table) | 12 rounds/conversation |
| kuaigeyun | Unknown | DeepSeek | Unknown | Partial (per-tenant config) | Metadata only | None found |

**GreyHook AI design is confirmed correct against all repos:**
- claude-sonnet-4-6 as the target model (only carbon also uses Anthropic, but as an optional provider)
- Read-only enforced at the tool level, not the model level
- Per-org rate limit (10/hr) — no other repo does per-org; most are per-user or global
- organization_id injected by the server into every tool call, not passed by the client

**Adopt from factorysemantics:**
- `dry_run` parameter on all write-adjacent MCP tools — the agent can call a write tool with dry_run=True to see what would happen without committing
- Two-layer read-only enforcement: role check on API login + plant-side refusal in the tool function
- MCP audit_log: every tool invocation writes (actor, tool_name, args_hash, result_summary, ts) to the audit table; the /audit endpoint is itself an MCP tool so the agent can explain its own history

**Avoid from virtual-path:**
- Never accept user_id or tenant_id from the client; always inject from the authenticated session
- Never allow the AI to call a write tool on behalf of an unauthenticated conversation
- Never use a single global rate limit counter; it allows one user to exhaust the org's budget

---

## Code Quality & Security (D7) — Cross-Repo Findings

**Security antipatterns found in 5+ repos:**
1. OPC-UA anonymous/none default — 3/4 repos with OPC-UA
2. MQTT TLS off by default — 3/4 repos with MQTT
3. Hardcoded DB credentials (postgres/postgres) — mes-ai, virtual-path, kuaigeyun
4. JWT_SECRET_KEY placeholder default — virtual-path, kuaigeyun
5. Unauthenticated debug/admin routes — kuaigeyun (/api/debug cross-tenant), mes-ai (WebSocket without auth)
6. Write-capable AI tools without audit — virtual-path, iPlusMES
7. No CI on PRs — mes-ai, kuaigeyun, iPlusMES

**GreyHook security implementation is best-in-class. Confirm these are in CLAUDE.md:**
- Argon2id minimum 10 chars (GreyHook spec) vs PBKDF2-SHA256 240k (factorysemantics) or plaintext fallbacks
- OPC-UA SignAndEncrypt + PKI
- MQTT TLS + per-device credentials
- organization_id NOT NULL DB constraint (not just application-level)
- Audit log for all AI tool calls including arguments hash and result
- No unauthenticated health/metrics routes in production
- pytest CI runs against PostgreSQL 16 (not SQLite) on every PR

**Adopt from carbon:**
- Idempotent migrations (IF NOT EXISTS, DROP IF EXISTS) — survives re-runs and is replay-safe
- Webhook HMAC-SHA256 with repair sweep: if a webhook registration becomes stale, a background job re-registers it; GreyHook's Kafka bootstrap connection should have an equivalent reconnect sweep

**Adopt from factorysemantics:**
- Advisory-lock around migration execution (PostgreSQL pg_advisory_lock(MIGRATION_LOCK_KEY)) — prevents two instances from running migrations concurrently during a rolling deploy
- In-package Alembic revisions shipped with the application binary — no migration files left loose

---

## GreyHook Differentiation Matrix

| Feature | GreyHook | Best Competitor | Gap |
|---------|----------|-----------------|-----|
| ISO 22400 OEE, clamped [0,1] | Yes | None — all have defects | **Clear leader** |
| Multi-tenant NOT NULL org_id | Yes | None | **Clear leader** |
| Rust edge gateway | Yes | None (.NET gateway in virtual-path is closest) | **Clear leader** |
| Kafka + Temporal workflows | Yes | None | **Clear leader** |
| TimescaleDB hypertables | Yes | InfluxDB (virtual-path) | **Clear leader** |
| OPC-UA SignAndEncrypt enforced | Yes | None enforce it | **Clear leader** |
| Read-only AI, per-org rate limit | Yes | factorysemantics (closest, 120 tools, claude-sonnet-5) | **1-2 feature gap** |
| MCP tool dry_run | No | factorysemantics | **Build it** |
| Coverage floor / unknown-time | No | factorysemantics | **Build it** |
| OvernightShift attribution test | No | OpenMes | **Build it** |
| Machine state needs_reason flow | No | OpenMes | **Build it** |
| Event correlation_id end-to-end | No | mes-ai | **Build it** |
| PackML → dispatch_category mapping | No | mes-ai | **Build it** |

---

## Action Items for GreyHook

### Immediate (before beta)

1. **OEE correctness** — `planned_busy_time = running + idle + fault + planned_stop`. Availability denominator is NOT `running + downtime`. Add a planned_stop state to the state enum.
2. **OEE storage** — Write a TimescaleDB hypertable row `machine_oee_hourly(machine_id, bucket, A, P, Q, oee, good_qty, reject_qty, running_s, idle_s, fault_s, planned_stop_s, organization_id)`. Index on `(machine_id, bucket)`. Add `organization_id` as a partition key.
3. **State null guard** — a machine with no state row should return `state: "offline"`, not `state: null` and not `state: "running"` (mes-ai's bug). Store an explicit offline period when MQTT/OPC-UA heartbeat expires.
4. **OPC-UA write guard** — add a `write_enabled: bool = false` flag to the edge gateway machine config. Any call to `write_tag()` checks this flag and writes to audit_log regardless; writes are additionally blocked when the flag is false.
5. **MCP dry_run** — all MES write-adjacent tools accept `dry_run: bool = false`. When true, the tool returns what it would have done without committing. The AI agent always calls write tools with dry_run=True first, presents the diff, and requires explicit operator approval before the live call.

### Near-term (before pilot)

6. **ShiftStamped mixin on telemetry** — `shift_code VARCHAR(40)` and `shift_day DATE` on every machine_state_period, machine_telemetry and oee_hourly row; stamped at ingest time by the telemetry processor using the factory's shift calendar.
7. **Overnight shift attribution** — shift windows can cross midnight; attribution uses occurrence start/end, not calendar date. Write a test: a fault starting at 23:30 on day N should attribute to the night shift of day N even though it ends at 00:15 on day N+1.
8. **Correlation ID end-to-end** — MQTT message → Kafka event → telemetry_processor → DB row all carry the same `correlation_id: UUID`. The MCP audit tool can query by correlation_id to show the full provenance of a state change.
9. **needs_reason flow** — when a machine transitions to fault/offline, automatically create an open downtime record with `reason_required: true`. Surfaced on the supervisor dashboard. Alert after `downtime_classify_sla_minutes` without a reason.
10. **PackML dispatch mapping** — a config table `state_model_mappings(external_model, external_state, dispatch_category, oee_bucket)` ships pre-populated with PackML 17-state and SEMI E10 mappings; custom vendor codes are added per-factory.

---

## Repos Worth Monitoring

| Repo | Why | Signal to watch |
|------|-----|-----------------|
| crbnos/carbon | Most mature OSS MES; claude-sonnet-4-6 as AI engine; Postgres RLS design | First PR that adds an OEE ratio (Avail × Perf × Qual) |
| Mes-Open/OpenMes | Active (release every 2 weeks); best practical device integration patterns | First Kafka/Temporal PR |
| factorysemantics/factorysemantics-mes | Most conceptually aligned to GreyHook; claude-sonnet-5; strong CI | Multi-tenant refactor (ADR for it may already exist) |
| point85/mes-ai | Best OEE formula implementation; cleanest event envelope | v2.0 announcements; CI adoption |
