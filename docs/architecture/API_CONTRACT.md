# API Contract — GreyHook MES

**Version**: 0.2
**Status**: FROZEN — requires ADR-review and both Agent 3 and founder approval before implementation begins
**Base URL**: `/api/v1`
**Auth**: Bearer JWT in `Authorization` header
**Timestamps**: ISO 8601 UTC (`2026-11-04T10:30:00Z`)
**IDs**: UUID strings

---

## Change log

| Version | Date | Author | Summary |
|---------|------|--------|---------|
| 0.1 | 2026-11-04 | Agent 2 (platform-edge) | Initial draft: auth, factories, machines, production, downtime, OEE, AI, SSE |
| 0.2 | 2026-11-04 | Agent 2 (platform-edge) | Extended to full completeness: shifts CRUD, production orders CRUD, machines CRUD, downtime PATCH/DELETE, organizations/factories/lines CRUD, users CRUD, health/metrics endpoints, Kafka event schemas, Temporal workflow interfaces |

---

## Authentication

### POST /auth/login

Auth: none required

Request:
```json
{ "email": "string", "password": "string" }
```

Response `200`:
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "token_type": "bearer",
  "expires_in": 900,
  "user": "UserSchema"
}
```

Errors: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401 — invalid credentials)

### POST /auth/refresh

Auth: none required

Request:
```json
{ "refresh_token": "string" }
```

Response `200`:
```json
{ "access_token": "string", "expires_in": 900 }
```

Errors: `UNAUTHORIZED` (401 — expired or revoked refresh token)

### POST /auth/logout

Auth: bearer JWT

Request:
```json
{ "refresh_token": "string" }
```

Response `200`: `{ "ok": true }`

Revokes the supplied refresh token. Idempotent.

---

## Health / Operations

### GET /health

Auth: none required

Response `200`:
```json
{ "status": "ok", "version": "string", "timestamp": "2026-11-04T10:30:00Z" }
```

Liveness probe. Returns `200` if the process is alive. No database check.

### GET /health/ready

Auth: none required

Response `200`:
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "kafka": "ok",
    "valkey": "ok"
  },
  "timestamp": "2026-11-04T10:30:00Z"
}
```

Response `503` (not ready):
```json
{
  "status": "not_ready",
  "checks": {
    "database": "ok",
    "kafka": "unreachable",
    "valkey": "ok"
  }
}
```

Readiness probe. Returns `200` only when database, Kafka bootstrap, and Valkey are reachable. Used by ECS health check and load balancer target group.

### GET /metrics

Auth: internal only (enforced by VPC security group — not bearer JWT)

Response: Prometheus text exposition format (content-type `text/plain; version=0.0.4`).

Standard metrics: `http_request_duration_seconds`, `http_requests_total`, `kafka_consumer_lag`, `temporal_workflow_pending_count`, `db_pool_connections_active`.

---

## Organizations

### POST /organizations

Auth: system admin (platform-level, not tenant-level; enforced via `PLATFORM_ADMIN_KEY` environment variable passed as `X-Admin-Key` header)

Request:
```json
{
  "name": "string",
  "slug": "string",
  "timezone": "Asia/Kolkata"
}
```

Response `201`: `OrganizationSchema`

Errors: `VALIDATION_ERROR` (400 — slug already taken), `FORBIDDEN` (403)

---

## Factories

### GET /factories

Auth: bearer JWT (any role)

Response `200`:
```json
{ "items": ["FactorySchema"], "total": 1 }
```

Returns factories within the authenticated user's organization only.

### GET /factories/{factory_id}

Auth: bearer JWT (any role)

Response `200`: `FactorySchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403 — different organization)

### POST /factories

Auth: bearer JWT, role `admin`

Request:
```json
{
  "name": "string",
  "location": "string"
}
```

Response `201`: `FactorySchema`

Errors: `VALIDATION_ERROR` (400), `FORBIDDEN` (403)

### PUT /factories/{factory_id}

Auth: bearer JWT, role `admin`

Request:
```json
{
  "name": "string",
  "location": "string"
}
```

Response `200`: `FactorySchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

### GET /factories/{factory_id}/lines

Auth: bearer JWT (any role)

Response `200`:
```json
{ "items": ["LineSchema"], "total": 1 }
```

### GET /factories/{factory_id}/machines

Auth: bearer JWT (any role)

Response `200`:
```json
{ "items": ["MachineSchema"], "total": 5 }
```

### GET /factories/{factory_id}/machines/status

Auth: bearer JWT (any role)

Response `200`:
```json
{ "items": ["MachineStatusSchema"], "as_of": "2026-11-04T10:30:00Z" }
```

---

## Production Lines

### POST /lines

Auth: bearer JWT, role `admin`

Request:
```json
{
  "factory_id": "uuid",
  "name": "string"
}
```

Response `201`: `LineSchema`

Errors: `VALIDATION_ERROR` (400 — factory not found or not in same org), `FORBIDDEN` (403)

---

## Shifts

### GET /factories/{factory_id}/shifts

Auth: bearer JWT (any role)

Response `200`:
```json
{
  "items": [
    {
      "id": "uuid",
      "factory_id": "uuid",
      "name": "Day Shift",
      "start_time": "06:00:00",
      "end_time": "14:00:00",
      "days_of_week": [1, 2, 3, 4, 5, 6],
      "planned_stops": [
        { "name": "Lunch", "duration_minutes": 30 },
        { "name": "Break 1", "duration_minutes": 10 },
        { "name": "Break 2", "duration_minutes": 10 }
      ],
      "planned_production_time_minutes": 430
    }
  ],
  "total": 1
}
```

### POST /factories/{factory_id}/shifts

Auth: bearer JWT, role `admin`

Request:
```json
{
  "name": "string",
  "start_time": "06:00:00",
  "end_time": "14:00:00",
  "days_of_week": [1, 2, 3, 4, 5, 6],
  "planned_stops": [
    { "name": "Lunch", "duration_minutes": 30 }
  ]
}
```

`days_of_week`: integers 1 (Monday) through 7 (Sunday). `end_time` may be less than `start_time` to represent a shift crossing midnight.

Response `201`: `ShiftSchema` (same shape as list item above)

Errors: `VALIDATION_ERROR` (400 — invalid time format, days_of_week empty), `FORBIDDEN` (403)

### PUT /shifts/{shift_id}

Auth: bearer JWT, role `admin`

Request: same fields as POST (full replacement)

Response `200`: `ShiftSchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

### DELETE /shifts/{shift_id}

Auth: bearer JWT, role `admin`

Response `200`: `{ "ok": true }`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403), `CONFLICT` (409 — shift is referenced by one or more production orders; the error body includes `{ "referenced_by": ["order_id", ...] }`)

Shift is deactivated (soft-deleted) if referenced. No hard delete while records exist.

---

## Machines

### POST /lines/{line_id}/machines

Auth: bearer JWT, role `admin`

Request:
```json
{
  "name": "string",
  "machine_type": "string",
  "protocol": "mqtt | opcua | simulated",
  "asset_tag": "string",
  "endpoint_config": {},
  "default_product_id": "uuid | null"
}
```

`protocol` defaults to `simulated` if omitted. `endpoint_config` schema varies by protocol (see Implementation Note).

Response `201`: `MachineSchema`

Errors: `VALIDATION_ERROR` (400 — duplicate name on same line, invalid protocol), `FORBIDDEN` (403), `NOT_FOUND` (404 — line not found)

### PATCH /machines/{machine_id}

Auth: bearer JWT, role `admin`

Request (all fields optional):
```json
{
  "name": "string",
  "machine_type": "string",
  "asset_tag": "string",
  "endpoint_config": {},
  "default_product_id": "uuid | null"
}
```

Response `200`: `MachineSchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400)

### DELETE /machines/{machine_id}

Auth: bearer JWT, role `admin`

Response `200`: `{ "ok": true, "deactivated": true }`

Soft delete only. Sets `is_active = false`. Returns `CONFLICT` (409) if records exist — in that case the machine is deactivated, not deleted, and the response explains this:

```json
{
  "ok": true,
  "deactivated": true,
  "note": "Machine has production records. Deactivated rather than deleted."
}
```

### GET /machines/{machine_id}/status

Auth: bearer JWT (any role)

Response `200`:
```json
{
  "machine_id": "uuid",
  "current_state": "running | idle | fault | offline",
  "state_since": "2026-11-04T10:30:00Z",
  "last_event_at": "2026-11-04T10:30:00Z"
}
```

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403)

### GET /machines/{machine_id}/events

Auth: bearer JWT (any role)

Query: `?from=ISO8601&to=ISO8601&limit=100&cursor=string`

Response `200`:
```json
{ "items": ["MachineEventSchema"], "next_cursor": "string | null" }
```

---

## Production Orders

### GET /lines/{line_id}/production/orders

Auth: bearer JWT (any role)

Query: `?status=scheduled|running|paused|completed|cancelled&from=ISO8601&to=ISO8601&limit=50&cursor=string`

Response `200`:
```json
{ "items": ["ProductionOrderSchema"], "total": 10, "next_cursor": "string | null" }
```

### POST /lines/{line_id}/production/orders

Auth: bearer JWT, role `supervisor` or above

Request:
```json
{
  "order_number": "string",
  "product_code": "string",
  "product_id": "uuid | null",
  "planned_qty": 500,
  "shift_id": "uuid",
  "planned_start": "2026-11-04T06:00:00Z",
  "planned_end": "2026-11-04T14:00:00Z"
}
```

Response `201`: `ProductionOrderSchema`

Errors: `VALIDATION_ERROR` (400 — planned_qty < 1, planned_end before planned_start, shift not in same factory), `FORBIDDEN` (403), `CONFLICT` (409 — another order already running on this line)

### GET /production/orders/{order_id}

Auth: bearer JWT (any role)

Response `200`: `ProductionOrderSchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403)

### PATCH /production/orders/{order_id}

Auth: bearer JWT, role `supervisor` or above

Request:
```json
{
  "status": "running | paused | completed | cancelled"
}
```

Allowed transitions: `scheduled → running`, `running → paused`, `paused → running`, `running → completed`, `scheduled → cancelled`. Completed and cancelled orders are immutable.

Response `200`: `ProductionOrderSchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403), `CONFLICT` (409 — invalid status transition; error body includes `{ "current_status": "completed", "requested_status": "running", "allowed_transitions": [] }`), `VALIDATION_ERROR` (400)

### GET /production/orders/{order_id}/summary

Auth: bearer JWT (any role)

Response `200`:
```json
{
  "order_id": "uuid",
  "order_number": "string",
  "product_code": "string",
  "shift_id": "uuid",
  "planned_qty": 500,
  "actual_qty": 440,
  "good_qty": 428,
  "rejected_qty": 12,
  "status": "completed",
  "planned_start": "2026-11-04T06:00:00Z",
  "planned_end": "2026-11-04T14:00:00Z",
  "actual_start": "2026-11-04T06:00:00Z",
  "actual_end": "2026-11-04T14:00:00Z",
  "total_downtime_seconds": 3300,
  "top_downtime_categories": [
    { "category": "ME-01", "duration_s": 1320, "event_count": 1 },
    { "category": "MA-01", "duration_s": 1080, "event_count": 1 },
    { "category": "CH-04", "duration_s": 900, "event_count": 1 }
  ],
  "production_miss": true,
  "production_miss_qty": 60
}
```

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403)

### GET /lines/{line_id}/production/current

Auth: bearer JWT (any role)

Response `200`:
```json
{
  "order_id": "uuid",
  "order_number": "string",
  "product_code": "string",
  "planned_qty": 500,
  "actual_qty": 312,
  "rejected_qty": 8,
  "shift_start": "2026-11-04T06:00:00Z",
  "shift_end": "2026-11-04T14:00:00Z",
  "elapsed_pct": 0.72,
  "completion_pct": 0.624,
  "estimated_completion_at": "2026-11-04T14:22:00Z"
}
```

`estimated_completion_at` is `null` if `actual_qty = 0`. Response `204` with empty body if no active order.

### GET /lines/{line_id}/production/history

Auth: bearer JWT (any role)

Query: `?from=ISO8601&to=ISO8601&granularity=shift|day`

Response `200`:
```json
{ "items": ["ProductionSummarySchema"] }
```

---

## Downtime

### GET /machines/{machine_id}/downtime

Auth: bearer JWT (any role)

Query: `?from=ISO8601&to=ISO8601`

Response `200`:
```json
{ "items": ["DowntimeEventSchema"], "total_duration_s": 2400 }
```

### POST /machines/{machine_id}/downtime

Auth: bearer JWT, role `operator` or above

Request:
```json
{
  "category": "string",
  "reason": "string | null",
  "started_at": "2026-11-04T09:30:00Z",
  "ended_at": "2026-11-04T09:48:00Z",
  "is_planned": false
}
```

`reason` is required when duration > 1800 seconds (30 minutes, Major severity). `ended_at` is optional for open events.

Response `201`: `DowntimeEventSchema`

Errors: `VALIDATION_ERROR` (400 — negative duration, reason required for Major+, retroactive entry outside current shift), `CONFLICT` (409 — overlapping event; error body includes `{ "conflict_event_id": "uuid", "conflict_range": { "started_at": "...", "ended_at": "..." } }`), `FORBIDDEN` (403)

### PATCH /downtime/{downtime_id}

Auth: bearer JWT, role `operator` or above

Request (all fields optional):
```json
{
  "category": "string",
  "reason": "string",
  "ended_at": "2026-11-04T09:48:00Z"
}
```

Used to categorize an auto-detected unclassified event or close an open event.

Response `200`: `DowntimeEventSchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400 — reason required for Major+)

### DELETE /downtime/{downtime_id}

Auth: bearer JWT, role `supervisor` or above

Response `200`: `{ "ok": true }`

Allowed only if the event was created within the current shift and the user has supervisor role or above. Attempting to delete an event from a previous shift returns `FORBIDDEN` (403).

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403 — different shift or insufficient role)

### GET /lines/{line_id}/downtime/pareto

Auth: bearer JWT (any role)

Query: `?from=ISO8601&to=ISO8601`

Response `200`:
```json
{
  "items": [
    { "category": "ME-01", "duration_s": 1320, "event_count": 1, "pct": 0.40 }
  ],
  "total_duration_s": 3300,
  "period": { "from": "2026-11-04T06:00:00Z", "to": "2026-11-04T14:00:00Z" }
}
```

---

## OEE

### GET /machines/{machine_id}/oee

Auth: bearer JWT (any role)

Query: `?from=ISO8601&to=ISO8601&granularity=hour|shift|day`

Response `200`:
```json
{
  "items": [
    {
      "period_start": "2026-11-04T06:00:00Z",
      "period_end": "2026-11-04T14:00:00Z",
      "granularity": "shift",
      "availability": 0.872,
      "performance": 0.914,
      "quality": 0.973,
      "oee": 0.777
    }
  ]
}
```

`performance` and `oee` are `null` when ideal cycle time is not configured. `quality` is `null` when `actual_qty = 0`.

### GET /lines/{line_id}/oee/summary

Auth: bearer JWT (any role)

Query: `?from=ISO8601&to=ISO8601`

Response `200`:
```json
{
  "availability": 0.872,
  "performance": 0.914,
  "quality": 0.973,
  "oee": 0.777,
  "period": { "from": "2026-11-04T06:00:00Z", "to": "2026-11-04T14:00:00Z" }
}
```

---

## AI Investigations

### POST /ai/investigations

Auth: bearer JWT, role `supervisor` or above

Request:
```json
{
  "question": "Why did Machine 3 lose production in the morning shift?",
  "context": {
    "machine_id": "uuid",
    "from": "2026-11-04T06:00:00Z",
    "to": "2026-11-04T14:00:00Z"
  }
}
```

Response `202`:
```json
{ "investigation_id": "uuid", "status": "pending" }
```

Errors: `VALIDATION_ERROR` (400 — question empty, time range invalid), `FORBIDDEN` (403)

Rate limit: 10 investigations per organization per hour.

### GET /ai/investigations/{investigation_id}

Auth: bearer JWT (any role)

Response `200`:
```json
{
  "id": "uuid",
  "status": "completed",
  "question": "string",
  "result": {
    "summary": "string",
    "observations": [
      {
        "claim": "string",
        "evidence": [{ "source": "string", "value": "any", "timestamp": "string" }]
      }
    ],
    "hypotheses": [
      { "text": "string", "confidence": "low | medium | high", "supporting_evidence": [] }
    ],
    "recommendations": [{ "action": "string", "rationale": "string" }]
  },
  "model_provider": "string",
  "model_id": "string",
  "created_at": "string",
  "completed_at": "string"
}
```

`result` is `null` while status is `pending` or `running`.

### POST /ai/investigations/{investigation_id}/feedback

Auth: bearer JWT, role `supervisor` or above

Request:
```json
{ "feedback": "positive | negative", "comment": "string | null" }
```

Response `200`: `{ "ok": true }`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403), `CONFLICT` (409 — feedback already submitted for this investigation)

---

## Users

### GET /users

Auth: bearer JWT, role `admin`

Query: `?is_active=true|false&role=admin|manager|supervisor|operator&limit=50&cursor=string`

Response `200`:
```json
{ "items": ["UserSchema"], "total": 10, "next_cursor": "string | null" }
```

Returns users in the authenticated user's organization only.

### POST /users

Auth: bearer JWT, role `admin`

Request:
```json
{
  "email": "string",
  "name": "string",
  "role": "admin | manager | supervisor | operator",
  "password": "string"
}
```

Response `201`: `UserSchema`

Errors: `VALIDATION_ERROR` (400 — email already exists, password too short), `FORBIDDEN` (403)

### PATCH /users/{user_id}

Auth: bearer JWT, role `admin`

Request (all fields optional):
```json
{
  "name": "string",
  "role": "admin | manager | supervisor | operator",
  "is_active": false
}
```

Response `200`: `UserSchema`

Errors: `NOT_FOUND` (404), `FORBIDDEN` (403 — user not in same organization or admin attempting to demote the last admin)

### GET /users/me

Auth: bearer JWT (any role)

Response `200`: `UserSchema`

---

## Real-time (Server-Sent Events)

### GET /sse/machines/{factory_id}/status

Auth: bearer JWT (any role) — token passed as `?token=` query parameter since EventSource does not support custom headers

Stream of `MachineStatusUpdateEvent`:
```
data: {"machine_id":"uuid","state":"running","timestamp":"2026-11-04T10:30:00Z","factory_id":"uuid"}
```

Connection is kept open. The server sends a heartbeat comment `": keepalive"` every 15 seconds to prevent proxy timeout.

---

## Product Definitions

### GET /product-definitions

Auth: bearer JWT (any role)

Query: `?is_active=true|false`

Response `200`: `{ "items": ["ProductDefinitionSchema"], "total": 10 }`

### POST /product-definitions

Auth: bearer JWT, role `admin`

Request:
```json
{
  "product_code": "string",
  "name": "string",
  "ideal_cycle_time_seconds": 50.0,
  "unit": "piece"
}
```

Response `201`: `ProductDefinitionSchema`

Errors: `VALIDATION_ERROR` (400 — duplicate product_code in organization, ideal_cycle_time_seconds <= 0), `FORBIDDEN` (403)

### PATCH /product-definitions/{product_id}

Auth: bearer JWT, role `admin`

Request (all fields optional):
```json
{
  "name": "string",
  "ideal_cycle_time_seconds": 48.5,
  "unit": "string",
  "is_active": false
}
```

Response `200`: `ProductDefinitionSchema`

---

## Common response schemas

```typescript
OrganizationSchema = {
  id: string, name: string, slug: string, timezone: string,
  created_at: string, updated_at: string
}

FactorySchema = {
  id: string, organization_id: string, name: string,
  location: string | null, created_at: string, updated_at: string
}

LineSchema = {
  id: string, organization_id: string, factory_id: string,
  name: string, created_at: string
}

UserSchema = {
  id: string, email: string, name: string,
  role: "admin" | "manager" | "supervisor" | "operator",
  is_active: boolean, created_at: string
}

MachineSchema = {
  id: string, organization_id: string, line_id: string,
  name: string, machine_type: string, asset_tag: string | null,
  protocol: "mqtt" | "opcua" | "simulated",
  is_active: boolean, created_at: string,
  default_product_id: string | null
}

MachineStatusSchema = {
  machine_id: string, name: string, line_id: string,
  current_state: "running" | "idle" | "fault" | "offline",
  state_since: string, last_event_at: string | null
}

MachineEventSchema = {
  event_id: string, machine_id: string, event_time: string,
  ingested_at: string, event_type: string, payload: object,
  source_seq: number | null, gateway_id: string
}

ShiftSchema = {
  id: string, organization_id: string, factory_id: string,
  name: string, start_time: string, end_time: string,
  days_of_week: number[],
  planned_stops: { name: string, duration_minutes: number }[],
  planned_production_time_minutes: number
}

ProductionOrderSchema = {
  id: string, organization_id: string, line_id: string,
  shift_id: string | null, order_number: string,
  product_code: string, product_id: string | null,
  planned_qty: number, actual_qty: number, rejected_qty: number,
  status: "scheduled" | "running" | "paused" | "completed" | "cancelled",
  planned_start: string, planned_end: string,
  actual_start: string | null, actual_end: string | null,
  created_at: string, updated_at: string
}

ProductionSummarySchema = {
  order_id: string, order_number: string, product_code: string,
  shift_id: string | null, planned_qty: number, actual_qty: number,
  good_qty: number, rejected_qty: number, status: string,
  planned_start: string, planned_end: string
}

DowntimeEventSchema = {
  id: string, organization_id: string, machine_id: string,
  order_id: string | null, category: string,
  reason: string | null, started_at: string,
  ended_at: string | null, duration_seconds: number | null,
  is_planned: boolean, logged_by: string | null, created_at: string
}

ProductDefinitionSchema = {
  id: string, organization_id: string, product_code: string,
  name: string, ideal_cycle_time_seconds: number,
  unit: string, is_active: boolean
}
```

---

## Error format

```json
{ "error": { "code": "MACHINE_NOT_FOUND", "message": "Machine uuid not found", "status": 404 } }
```

Standard codes: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `VALIDATION_ERROR` (422), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500)

---

## Kafka event schemas

All Kafka messages are JSON-serialized UTF-8. The partition key is `machine_id` for telemetry topics and `order_id` / `machine_id` for production and downtime topics respectively.

### Topic: `mes.telemetry.raw`

Produced by: Rust edge gateway

```json
{
  "event_id": "uuid",
  "machine_id": "uuid",
  "organization_id": "uuid",
  "event_time": "2026-11-04T10:30:00.123Z",
  "source_timestamp": "2026-11-04T10:30:00.100Z",
  "gateway_id": "string",
  "event_type": "string",
  "payload": {},
  "source_seq": 1234567
}
```

- `event_time`: timestamp assigned by the edge gateway (UTC).
- `source_timestamp`: original timestamp from the PLC/sensor device (UTC where possible, converted at gateway).
- `source_seq`: monotonic sequence number from the device or edge gateway; used for ordering within a machine stream.
- `payload`: protocol-specific event data (e.g. OPC UA node value map, MQTT payload).

### Topic: `mes.telemetry.normalized`

Produced by: Rust telemetry processor

Same fields as `mes.telemetry.raw` plus:

```json
{
  "normalization_flags": ["timestamp_coerced_to_utc", "payload_schema_v1"],
  "dedup_status": "accepted | duplicate"
}
```

- `normalization_flags`: array of string tags applied during normalization (e.g. `timestamp_coerced_to_utc`, `source_seq_missing`, `payload_schema_v1`).
- `dedup_status`: `duplicate` events are forwarded to the topic for observability but are not written to the database by the ingestion worker.

### Topic: `mes.production.events`

Produced by: Python ingestion worker (triggered by Temporal workflow signals)

```json
{
  "event_id": "uuid",
  "organization_id": "uuid",
  "order_id": "uuid",
  "machine_id": "uuid",
  "event_time": "2026-11-04T10:30:00Z",
  "event_type": "count_increment | order_started | order_completed | order_paused",
  "quantity_delta": 1,
  "cumulative_qty": 312
}
```

- `quantity_delta`: units added in this event (0 for state-change events like `order_started`).
- `cumulative_qty`: running total for the order at the time of this event.

### Topic: `mes.downtime.events`

Produced by: Python ingestion worker and backend API (on manual downtime entry)

```json
{
  "event_id": "uuid",
  "organization_id": "uuid",
  "machine_id": "uuid",
  "downtime_event_id": "uuid",
  "event_time": "2026-11-04T10:30:00Z",
  "event_type": "downtime_opened | downtime_closed | downtime_categorized",
  "category_code": "ME-01 | null",
  "duration_seconds": null
}
```

- `category_code`: `null` for `downtime_opened` events (not yet categorized).
- `duration_seconds`: `null` while the event is open; populated on `downtime_closed`.

### Topic: `mes.alerts`

Produced by: Python alert service (monitors telemetry.normalized and oee_aggregates)

```json
{
  "event_id": "uuid",
  "organization_id": "uuid",
  "machine_id": "uuid",
  "alert_type": "machine_offline | machine_fault | oee_below_threshold",
  "severity": "low | medium | high | critical",
  "triggered_at": "2026-11-04T10:30:00Z",
  "context": {
    "machine_name": "string",
    "threshold_value": 0.5,
    "actual_value": 0.32,
    "state": "offline"
  }
}
```

- `alert_type`:
  - `machine_offline`: machine has not sent telemetry for > 60 seconds (threshold configurable).
  - `machine_fault`: machine entered `fault` state.
  - `oee_below_threshold`: hourly OEE dropped below configured alert threshold (default 50%).
- `severity`:
  - `low`: informational.
  - `medium`: attention needed within the shift.
  - `high`: immediate supervisor attention required.
  - `critical`: escalation to manager required (> 2 hours downtime).

---

## Temporal workflow interfaces

The backend Python workers register the following Temporal workflows. All workflows are started with an `organization_id` in the input to enforce tenant isolation inside the workflow.

### ProductionOrderWorkflow

**Purpose**: Manages the full lifecycle of a production order from creation to completion. Maintains durable state for the order's current status and running counts.

**Input**:
```json
{
  "order_id": "uuid",
  "line_id": "uuid",
  "organization_id": "uuid",
  "planned_qty": 500,
  "product_id": "uuid | null"
}
```

**Signals accepted**:

| Signal name | Payload | Description |
|-------------|---------|-------------|
| `start_production` | `{ "started_at": "ISO8601" }` | Transition order to `running` |
| `pause_production` | `{ "paused_at": "ISO8601" }` | Transition order to `paused` |
| `complete_production` | `{ "completed_at": "ISO8601" }` | Transition order to `completed` and close workflow |
| `count_increment` | `{ "qty": 1, "rejected": false, "event_id": "uuid", "event_time": "ISO8601" }` | Increment actual or rejected count idempotently by `event_id` |

**Queries exposed**:

| Query name | Response | Description |
|------------|----------|-------------|
| `get_current_state` | `{ "status": "running", "actual_qty": 312, "rejected_qty": 8, "updated_at": "ISO8601" }` | Current in-memory order state |
| `get_counts` | `{ "actual_qty": 312, "rejected_qty": 8, "good_qty": 304 }` | Current production counts |

**Timeout**: workflow execution timeout 36 hours (covers overnight shifts with buffer). Activity timeouts: 30 seconds with 3 retries and exponential backoff starting at 2 seconds.

---

### DowntimeWorkflow

**Purpose**: Tracks the state of a single downtime event from opening to categorization and close. Provides durable, queryable state for the downtime state machine.

**Input**:
```json
{
  "machine_id": "uuid",
  "organization_id": "uuid",
  "started_at": "ISO8601",
  "auto_opened": true
}
```

**Signals accepted**:

| Signal name | Payload | Description |
|-------------|---------|-------------|
| `close_downtime` | `{ "ended_at": "ISO8601", "category_code": "ME-01", "reason": "string | null" }` | Close the downtime event and record duration |
| `categorize_downtime` | `{ "category_code": "ME-01", "reason": "string | null" }` | Update category on an open or closed event |

**Queries exposed**:

| Query name | Response | Description |
|------------|----------|-------------|
| `get_duration_seconds` | `{ "duration_seconds": 1320, "is_open": false }` | Current or final duration |
| `get_category` | `{ "category_code": "ME-01", "reason": "Bearing seized", "is_categorized": true }` | Current categorization state |

**Timeout**: workflow execution timeout 48 hours (handles downtime events that span shifts or extend overnight). The `categorize_downtime` activity has a 4-hour reminder timer — if no categorization signal is received within 4 hours of `started_at`, the workflow publishes an event to `mes.alerts` with `alert_type: machine_fault` and severity based on duration.

---

### AIInvestigationWorkflow

**Purpose**: Orchestrates the multi-step AI investigation process: data retrieval, LLM tool-calling loop, evidence assembly, and result storage.

**Input**:
```json
{
  "investigation_id": "uuid",
  "organization_id": "uuid",
  "question": "string",
  "context": {
    "machine_id": "uuid | null",
    "from": "ISO8601",
    "to": "ISO8601"
  }
}
```

**Activities executed** (in order, with retry and timeout per activity):

| Activity | Timeout | Retries | Description |
|----------|---------|---------|-------------|
| `fetch_machine_history` | 10s | 3 | Retrieve machine state periods for the context window |
| `fetch_downtime_events` | 10s | 3 | Retrieve downtime events for the context window |
| `fetch_production_summary` | 10s | 3 | Retrieve production order counts and OEE for the context window |
| `call_llm_with_tools` | 25s | 1 | Call the configured LLM provider with retrieved data as context and structured tool definitions |
| `store_result` | 5s | 3 | Write the structured result to `ai_investigations` table |

**No signals**. No external inputs after workflow start.

**Queries exposed**:

| Query name | Response | Description |
|------------|----------|-------------|
| `get_status` | `{ "status": "running", "current_activity": "fetch_downtime_events" }` | Current progress for UI polling |

**Workflow timeout**: 60 seconds. If `call_llm_with_tools` exceeds its timeout, the workflow marks the investigation as `failed` with `{ "error": "LLM_TIMEOUT" }` and exits cleanly.

---

## Contract change rules

- Breaking changes (rename fields, remove endpoints, change required field types) require review gate before frontend/AI adoption, with explicit sign-off from Agent 3 and the founder recorded in this file's change log.
- Non-breaking additions (new optional fields, new endpoints) can proceed after platform-edge documents the change and bumps the version.
- Version bump in this file header required for every change.
- Kafka schema changes are breaking — consumers must be updated atomically with producers. Schema changes require a migration plan.
- Temporal workflow interface changes (new signals, changed input shape) are breaking for in-flight workflows. Plan for workflow versioning using Temporal's `workflow.get_version()` API.
