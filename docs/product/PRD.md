# Product Requirements Document — GreyHook MES MVP

**Version**: 0.2  
**Status**: IN_REVIEW  
**Date**: 2026-11-04  
**Owner**: Agent 1 — Product & Manufacturing Architect

---

## Executive summary

GreyHook MES is an AI-native manufacturing execution system for Indian small and medium-sized factories that delivers real-time production visibility, OEE measurement, and evidence-backed root-cause investigations through a web interface accessible from any device. It replaces spreadsheets and whiteboards with live machine status, shift production tracking, and downtime attribution — enabling supervisors and plant managers to identify and act on production losses in under five minutes. The MVP targets one factory with up to five machines and is designed to validate the core value hypothesis before expanding to multi-site deployment.

---

## Problem statement

Indian SME manufacturers operating in the ₹5–200 Cr revenue band lose an estimated 20–40% [ASSUMPTION] of potential production capacity per year due to three compounding failures:

**1. Invisible downtime.** When a machine stops, the time lost is typically recorded manually on paper or not at all. No aggregate view of downtime by cause exists. Root-cause investigation happens days later, by memory, with no data.

**2. Reactive production management.** Supervisors discover that a shift target will be missed only near shift end, when corrective action is impossible. There is no live actual-vs-planned view on the shop floor.

**3. No shift handover quality.** The outgoing shift passes information verbally. The incoming supervisor has no structured record of what happened — which machines ran, what failed, what was produced.

The consequence: factories consistently underperform their theoretical capacity without knowing why, and cannot prioritize which machines or processes to improve.

**Scale of the opportunity.** There are approximately 150,000 [ASSUMPTION] SME manufacturing units in India with 10–500 employees. Existing enterprise MES solutions (SAP MII, Siemens Opcenter, Rockwell Plex) cost ₹50L–5Cr to deploy and require dedicated IT teams — out of reach for this segment. Smaller factories use Excel, whiteboards, and intuition.

---

## Target customer segment

### Industry verticals (MVP focus)

| Vertical | Fit | Rationale |
|----------|-----|-----------|
| Automotive components | High | High-volume, repetitive cycles, OEE-sensitive, well-defined parts |
| Precision machining | High | CNC-heavy, cycle-time-driven, high reject cost |
| Plastic injection moulding | Medium | Repetitive cycles but highly automated; may need less manual entry |
| Food processing | Medium | Longer runs, different downtime taxonomy; validate separately [ASSUMPTION] |

### Factory profile (MVP target)

| Dimension | MVP target |
|-----------|-----------|
| Revenue | ₹5–50 Cr [ASSUMPTION] |
| Employees | 25–200 [ASSUMPTION] |
| Production lines | 1–3 |
| Machines | 5–50 (MVP: 3–5) |
| Existing ERP | Tally, SAP B1, or none |
| Existing MES | None |
| IT maturity | Low — no dedicated IT staff, smartphones available [ASSUMPTION] |
| Machine connectivity | PLC/sensor data accessible via MQTT or OPC UA, or no connectivity (manual entry) |

### Technology maturity assumption

[ASSUMPTION] The pilot factory has at least one person who can configure Wi-Fi connectivity and manage a cloud-hosted web application without on-site IT support. Factories with no smartphone or internet access are out of scope for the MVP.

---

## User personas

### Persona 1 — Factory Admin (Ramesh, IT/Operations In-Charge)

**Role**: Responsible for setting up the system, adding machines, configuring shifts, and managing user accounts. Usually the owner, plant head, or operations manager in a small factory.

**Goals**:
- Set up the system once and not need to touch it again for routine operation.
- Add a new machine or shift without IT help.
- Know that only the right people can see production data.

**Pain points**:
- Current tools (Excel templates, paper) require manual setup per shift and are inconsistent across users.
- No way to enforce a standard shift schedule across the floor.
- Onboarding new machines or operators requires updating multiple disconnected documents.

**Key questions this platform answers**:
- Is every machine configured and connected?
- Who has access to what data?
- Was today's shift schedule applied correctly?

**Tech comfort**: Medium. Can navigate web interfaces; not a developer. May need onboarding for first setup.

---

### Persona 2 — Plant Manager (Suresh, Factory Owner / Production Head)

**Role**: Owns the factory P&L. Reviews production performance daily and weekly. Not on the floor full time — typically reviews data from an office or on a phone.

**Goals**:
- See today's production performance versus target without calling anyone.
- Understand OEE trend over the last week to decide where to invest.
- Have a data-backed answer ready for a customer asking why an order is delayed.

**Pain points**:
- Receives production data via WhatsApp message from supervisors — unstructured, unverifiable.
- OEE is calculated manually in Excel, inconsistently, once a week.
- Cannot tell whether a machine's downtime this week is worse than last week without digging through paper logs.

**Key questions this platform answers**:
- What is today's OEE per machine?
- Which machine caused the most production loss this week?
- Are we going to hit the shift target?

**Tech comfort**: Low-medium. Uses WhatsApp and email daily; comfortable with dashboards but will not configure anything.

---

### Persona 3 — Production Supervisor (Priya, Shift Supervisor)

**Role**: Runs one shift (8 hours). Responsible for machine uptime, operator assignments, meeting the shift production target. Present on the floor at all times.

**Goals**:
- Know at a glance which machines are running and which have stopped.
- Log downtime quickly when a machine faults, without leaving the floor.
- Hand over the shift with a clear record of what happened.

**Pain points**:
- When a machine faults, there is no alert — relies on operator walking over to tell them.
- Downtime logs are paper-based and get lost or are illegible at shift handover.
- No estimated completion time — cannot tell if the shift will hit the target until the last hour.

**Key questions this platform answers**:
- Which machines are running right now?
- How much time did we lose on each machine, and to what cause?
- Will we make the shift target?

**Tech comfort**: Medium. Uses phone daily; can navigate a web app on a tablet. Will not tolerate slow or complex UI.

---

### Persona 4 — Machine Operator (Ravi, CNC Operator)

**Role**: Operates one or two machines. Responsible for running cycles, changing tools, and reporting faults. Minimal administrative responsibility.

**Goals**:
- See how many parts have been produced versus today's target.
- Record a downtime reason quickly when a machine stops.
- Get acknowledgment that a fault has been logged.

**Pain points**:
- No visible production counter against target — does not know if behind or ahead.
- Downtime reporting is verbal to supervisor — often not logged correctly.
- Gets no feedback when a fault is under investigation.

**Key questions this platform answers**:
- How many parts have I made today, and how many are left?
- Has my downtime been logged?
- What am I supposed to produce right now?

**Tech comfort**: Low. May not have used a web app. Interface must be simple, large-text, minimal taps.

---

## MVP feature requirements

### F01 — Factory configuration

**Description**: Allows a Factory Admin to set up and maintain the organizational structure of the factory: the organization, factory entity, production lines, machines, shift schedules, production targets, and user accounts. This is the foundation all other features depend on.

**User stories**: US-001, US-002, US-003

**Business rules**:
- An organization must exist before a factory can be created.
- A factory must have at least one production line before machines can be added.
- A machine must belong to a production line.
- Shift schedules must include planned stops (breaks, changeovers) for OEE calculation to be accurate.
- Each user account must be assigned exactly one role: admin, manager, supervisor, or operator.
- Role permissions: admin (full access), manager (read all + approve investigations), supervisor (read + log downtime + close shifts), operator (read own machine + log downtime).
- A machine cannot be deleted if it has production or downtime records — it must be deactivated.
- The system must support at least one shift schedule with configurable start time, duration, and planned stop windows.

**Edge cases**:
- Admin adds a machine but does not configure a protocol — machine should appear as `simulated` by default.
- Admin sets shift end time that crosses midnight — shift must span two calendar days correctly (see also F05 and F03 handling of midnight shifts).
- Admin deactivates a machine mid-shift — in-flight events must be preserved; machine disappears from live status view only.
- Two admins edit the same machine simultaneously — last write wins; no silent data loss.

**Out of scope**:
- ERP synchronization for machine or product master data.
- Multi-factory configuration from a single admin account.
- SSO / LDAP integration.
- Custom role creation.

---

### F02 — Machine status monitoring

**Description**: Provides a real-time view of every machine in the factory, showing its current state (Running, Idle, Fault, Offline), time in that state, and a historical timeline. Triggers alerts when a machine goes offline unexpectedly.

**User stories**: US-004, US-005, US-006

**Business rules**:
- Machine states: `running`, `idle`, `fault`, `offline`. These are the only four states in the MVP.
- `offline` is a system-inferred state: the platform marks a machine offline if no telemetry event has been received for more than 60 seconds. [ASSUMPTION — threshold to validate]
- `fault` is set by the machine (via MQTT/OPC UA signal) or by the simulated data feed.
- `idle` means the machine is powered on and connected but not producing.
- `running` means the machine is actively producing parts.
- State transitions are recorded as immutable events with timestamps (UTC).
- The machine status view must reflect the state within 10 seconds of a real state change.
- A supervisor and all users watching the factory view must receive an alert within 60 seconds of a machine entering `offline` or `fault` state.
- Machine state history must be retained for at least 90 days. [ASSUMPTION]

**Edge cases**:
- Machine goes offline for < 60s and recovers — no `offline` alert should fire; the gap in telemetry is recorded but not escalated.
- Machine has never reported a state since being added — display as `offline` with "No telemetry received."
- Machine sends conflicting state events within the same second (edge-gateway deduplication failure) — take the later timestamp.
- Machine enters fault state at shift end — the downtime event must be open and carry into the next shift's records correctly.
- Network partition between edge gateway and cloud: telemetry buffers locally; on reconnect, historical events are replayed and states are backfilled.

**Out of scope**:
- Automatic machine restart commands from the platform.
- Vibration, temperature, or analog sensor streams beyond state signals.
- PLC program parameter reads.

---

### F03 — Production tracking

**Description**: Displays the current production order for each line, showing actual units produced versus planned, real-time progress, estimated shift completion time, and a shift-end summary report.

**User stories**: US-007, US-008, US-009

**Business rules**:
- Each production line runs one active production order at a time.
- A production order specifies: product code, planned quantity, shift.
- Actual count is incremented by telemetry events (pulse counter, MQTT message, or manual entry).
- Rejected count is tracked separately; it contributes to total count but not good count.
- Completion percentage = actual_qty / planned_qty × 100.
- Estimated completion time is calculated as: `shift_start + (elapsed_time / actual_qty × planned_qty)`. If actual_qty = 0, no estimate is shown.
- A shift summary is generated automatically at shift end (configurable close time) containing: planned qty, actual qty, good qty, rejected qty, downtime total, top 3 downtime categories.
- If the shift ends and actual < planned, the gap is recorded as a production miss event.

**Edge cases**:
- Shift spans midnight — the production order and counts must remain associated with the shift definition, not split by calendar date. OEE and shift summary must aggregate correctly.
- All units produced are rejected (rejected_qty = actual_qty) — Quality = 0%. The system must display this explicitly and not divide by zero in OEE calculations. [See OEE_RULES.md]
- Production order is changed mid-shift — previous production counts are closed under the old order; new counts begin under the new order. Historical summary preserves both.
- Actual count exceeds planned quantity — this is a valid state; completion percentage displays > 100% and estimated completion time shows "Target exceeded."
- No production count events for > 15 minutes during a running state — platform does not auto-infer counts; it records the gap and flags it in the shift summary.

**Out of scope**:
- Multi-step work-in-progress routing between machines on the same order.
- Rework routing (rejected parts re-entering the line).
- Product costing or material consumption.

---

### F04 — Downtime tracking

**Description**: Automatically detects machine downtime from state transitions and allows supervisors and operators to categorize it using the DOWNTIME_TAXONOMY.md classification. Provides a Pareto chart of downtime causes for a shift or date range.

**User stories**: US-010, US-011, US-012, US-013

**Business rules**:
- A downtime event is automatically opened when a machine transitions to `fault` or `offline` state.
- Planned stops (breaks, PM) can be manually entered; they are categorized separately and excluded from availability loss calculation per OEE_RULES.md.
- Every downtime event must be categorized within 4 hours of occurrence. [ASSUMPTION]
- Uncategorized events after 4 hours are labelled `UC — Unclassified` for reporting.
- Manual downtime entry is allowed retroactively within the same shift window only.
- Overlapping downtime events on the same machine are not permitted — the system rejects the entry with a validation error.
- Severity classification is auto-assigned based on duration (see DOWNTIME_TAXONOMY.md severity table).
- A downtime event that is `Major` (> 30 min) requires a reason field, not just a category code.
- A downtime event that is `Critical` (> 2 hr) triggers an in-app escalation notification to the supervisor role.

**Edge cases**:
- Operator logs downtime reason after the fact (within same shift) — allowed; system records the entry time and the original event timestamp separately.
- Downtime event started at end of shift and extends into the next shift — the event spans shifts; availability loss is allocated to each shift proportionally. [ASSUMPTION — to validate]
- Supervisor tries to log a downtime event that overlaps an existing event — system must return a clear error listing the conflicting event ID and time range.
- Machine is offline for an entire shift — availability = 0%; downtime event covers the full planned production time; shift summary shows 100% availability loss.

**Out of scope**:
- Maintenance work order creation from downtime events.
- Integration with CMMS (Computerized Maintenance Management Systems).
- Automated root-cause suggestion during categorization (this is an AI feature in F06).

---

### F05 — OEE dashboard

**Description**: Displays Availability, Performance, Quality, and OEE per machine per shift, with a 7-day trend chart and a shift comparison view. All calculations follow the formulas defined in OEE_RULES.md.

**User stories**: US-014, US-015, US-016

**Business rules**:
- OEE formula: `OEE = Availability × Performance × Quality` as defined in OEE_RULES.md.
- OEE is calculated per machine per shift. Aggregation to daily and line-level is derived from shift data.
- Planned Production Time = Shift Duration − Planned Stops.
- Run Time = Planned Production Time − Unplanned Downtime.
- Availability = Run Time / Planned Production Time.
- Performance = (Ideal Cycle Time × Actual Count) / Run Time. Requires ideal cycle time to be configured per machine per product code. [ASSUMPTION — must be configured before OEE is meaningful]
- Quality = Good Count / Total Count. If Total Count = 0, Quality is undefined and displays as "—".
- OEE trend chart shows the last 7 calendar days of shift-level OEE per machine.
- Shift comparison view shows this shift vs same shift yesterday and vs 7-day average.
- OEE values are displayed as percentages to one decimal place.
- OEE components are color-coded: green ≥ 75%, amber 50–74%, red < 50%. [ASSUMPTION — thresholds to validate with users]

**Edge cases**:
- Shift spans midnight — OEE is calculated over the full shift window, not split at midnight. The shift is attributed to the calendar day on which it started.
- Ideal cycle time not configured for a machine — Performance displays as "—" with a tooltip: "Configure ideal cycle time to calculate Performance."
- Machine offline for the entire planned shift — Availability = 0%; Performance and Quality display as "—" (no production occurred).
- All units rejected — Quality = 0%; OEE = 0%.
- 7-day trend requested but factory has only 2 days of data — chart shows available data points; missing days shown as gaps, not zeros.

**Out of scope**:
- Real-time OEE (second-by-second) — OEE is computed per hour and per shift.
- Benchmarking against external industry OEE databases.
- OEE target-setting and variance alerts (post-pilot feature).

---

### F06 — AI production intelligence

**Description**: A natural language interface that allows users to ask questions about production data and receive evidence-backed answers structured as observations, hypotheses, and recommendations. The AI reads from production data only and cannot issue commands to machines.

**User stories**: US-017, US-018, US-019, US-020

**Business rules**:
- The AI receives a question and an optional context window (machine_id, time range) via POST /ai/investigations.
- The response must separate observations (what the data shows), hypotheses (possible explanations), and recommendations (suggested actions).
- Every claim in the observations section must include at least one cited evidence item (source, value, timestamp) traceable to backend data.
- Confidence levels (low, medium, high) must be assigned to each hypothesis.
- The AI must never issue commands to machines, modify production data, or simulate actions. Any such request must be explicitly refused with a plain-language explanation.
- If the queried time range has incomplete data (gaps > 15 minutes), the AI must acknowledge the data gap in its response.
- Users can submit thumbs-up or thumbs-down feedback per investigation (POST /ai/investigations/{id}/feedback).
- AI response time target: < 30 seconds. If investigation is still pending after 30 seconds, the UI shows a "still analyzing" indicator.
- AI investigations are read-only: they observe and explain but do not write to the production database.

**Edge cases**:
- User asks the AI to "stop machine M001" — AI must refuse with: "I can only observe and analyze production data. I cannot control machines. Please contact your supervisor."
- User asks about a time range with missing data — AI must acknowledge: "Data is unavailable for [period]. The following analysis is based on available data: [hours]."
- User asks in a language other than English — [ASSUMPTION] MVP supports English only. Non-English queries will receive a response in English asking the user to rephrase in English.
- Multiple simultaneous investigations for the same factory — each runs independently; no cross-contamination of context.
- Investigation returns no meaningful data (machine had no events in the queried period) — response acknowledges this explicitly rather than fabricating observations.

**Out of scope**:
- AI-generated commands or automated corrective actions.
- Scheduled AI investigations (triggered automatically at shift end).
- AI training or fine-tuning on factory-specific data in the MVP.
- Voice interface.

---

## Non-functional requirements

### Performance
- Dashboard initial load: < 2 seconds for all machine statuses and current shift production summary.
- Telemetry-to-display latency: machine state changes visible in the UI within 10 seconds of occurrence.
- AI investigation response: < 30 seconds from submission to `completed` status.
- API endpoints (non-AI): p95 response time < 500ms under normal load.

### Availability
- Target: 99.5% uptime during production hours (06:00–18:00 IST, Monday–Saturday). [ASSUMPTION — pilot hours]
- Planned maintenance windows are excluded from availability calculation.
- Edge gateway must buffer telemetry locally for up to 24 hours during cloud outages and replay on reconnect.

### Security
- All API calls require Bearer JWT authentication.
- Role-based access control enforced server-side per endpoint.
- Refer to `docs/security/SECURITY_BASELINE.md` for full security controls. [File to be authored by Agent 2]
- Production data must not be transmitted unencrypted (TLS 1.2+).
- API keys and credentials are never stored in client-side code or git.

### Scalability
- MVP: 1 factory, 1 production line, 3–5 machines, 4 user accounts.
- Architecture must support 10 factories, 10 production lines each, 50 machines per factory, 50 user accounts without schema changes or rearchitecting. [ASSUMPTION — target to validate at architecture review]
- TimescaleDB hypertables handle time-series telemetry scaling; no row-level partitioning changes needed for the scale targets above.

### Localization
- MVP: English only.
- Timestamps display in IST (UTC+5:30) in the UI; stored as UTC in the database.
- Currency and quantity units configurable per factory (default: INR, pieces).

---

## Demo scenario — Automotive components factory

### Factory definition

| Entity | Value |
|--------|-------|
| Organization | GreyHook Demo Org |
| Factory | Pune Auto Parts Pvt Ltd |
| Production line | Line 1 — CNC & Assembly |
| Shift | Day shift: 06:00–14:00 IST |
| Planned output | 500 units per shift |
| Product code | AUTO-AXLE-32 |

### Machines

| ID | Name | Type | Protocol |
|----|------|------|----------|
| M001 | CNC Lathe | CNC machining | Simulated |
| M002 | Quality Inspection | Vision + manual check | Simulated |
| M003 | Assembly Station | Manual + fixture | Simulated |

### Simulated shift events

| Time (IST) | Machine | Event | Downtime category |
|------------|---------|-------|-------------------|
| 06:00 | All | Shift start — all machines Running | — |
| 07:45 | M001 | Fault — 22-min stoppage | ME-01 (Mechanical failure) |
| 09:30 | M003 | Idle — 18-min wait | MA-01 (Raw material shortage) |
| 11:15 | M001 | CH-04 — 15-min trial run | CH-04 (Trial run / first-off) |
| 14:00 | All | Shift end | — |

### Simulated production counts

| Machine | Planned role | Actual units at shift end | Rejected units |
|---------|-------------|--------------------------|----------------|
| M001 | Primary machining | 440 (missed due to downtime) | 12 |
| M002 | 100% inspection | 440 inspected | 8 |
| M003 | Assembly | 432 assembled | 0 |

### OEE baseline

OEE targets are not set for the pilot. The demo scenario is used to establish a baseline reading and validate that OEE calculations match manual cross-check values.

Expected baseline (illustrative — will differ on actual run):
- Availability: approximately 83% (55 min downtime / 480 min shift, minus 50 min planned stops)
- Performance: approximately 91% (dependent on configured ideal cycle time) [ASSUMPTION]
- Quality: approximately 97%
- OEE: approximately 73% [ASSUMPTION — to be validated on first demo run]

---

## Open assumptions

| ID | Assumption | Used in | Owner | Validation method |
|----|------------|---------|-------|-------------------|
| A-001 | SME factories lose 20–40% of production capacity to untracked downtime | Problem statement | Agent 1 | Industry research / pilot baseline measurement |
| A-002 | Approximately 150,000 SME manufacturing units in India with 10–500 employees | Market sizing | Agent 1 | MoSPI / NSSO census data |
| A-003 | Target revenue band: ₹5–50 Cr | Customer segment | Agent 1 | Sales discovery interviews |
| A-004 | Target employee count: 25–200 | Customer segment | Agent 1 | Sales discovery interviews |
| A-005 | Pilot factory has a person able to configure Wi-Fi and manage a web app without IT support | Deployment | Agent 1 | Pilot partner qualification |
| A-006 | Break schedule default: 1 × 30 min lunch, 2 × 10 min breaks for 8-hour shift | OEE / F01 | Agent 1 | Factory field interview |
| A-007 | Ideal cycle time is configured per machine per product code | OEE Performance / F05 | Agent 1 | Machine spec validation |
| A-008 | Offline threshold: machine marked offline after 60 seconds with no telemetry | F02 | Agent 2 | Factory validation on actual network quality |
| A-009 | Downtime categorization required within 4 hours of event | F04 | Agent 1 | Supervisor workflow interview |
| A-010 | Downtime spanning shift boundary: loss allocated proportionally to each shift | F04 | Agent 1 | Factory validation |
| A-011 | OEE color thresholds: green ≥ 75%, amber 50–74%, red < 50% | F05 | Agent 1 | User testing with supervisors |
| A-012 | MVP supports English only; non-English queries unsupported | F06 | Agent 1 | Pilot partner language assessment |
| A-013 | Pilot production hours: 06:00–18:00 IST, Monday–Saturday | NFR / Availability | Agent 1 | Pilot partner confirmation |
| A-014 | Architecture can scale to 10 factories, 50 machines without schema changes | NFR / Scalability | Agent 2 | Load test at architecture review |
| A-015 | Pilot OEE baseline approximately 73% for demo automotive scenario | Demo scenario | Agent 1 | Validated on first demo run |
| A-016 | Food processing vertical has different downtime taxonomy requiring separate validation | Customer segment | Agent 1 | Field interviews with food processing factories |

---

## Pilot success metrics

The 12-week pilot is declared successful when all five of the following criteria are met:

| # | Metric | Target | Measurement method |
|---|--------|--------|--------------------|
| P1 | Time-to-insight | A production supervisor can identify where production was lost in the last shift in < 5 minutes, without training | Observed usability test with real supervisor, 3 participants |
| P2 | Downtime capture rate | ≥ 80% of downtime events > 5 minutes are captured and categorized in the platform (vs. paper logs) | Cross-check platform logs against paper records for 2 weeks |
| P3 | OEE baseline established | A complete, defensible OEE reading (all 3 components) exists for each machine for ≥ 10 consecutive shifts | Platform OEE report reviewed by plant manager and confirmed as credible |
| P4 | AI investigation utility | ≥ 60% of AI investigation responses receive a thumbs-up rating from the supervisor who submitted the query | Platform feedback data over 4 weeks of active use |
| P5 | System reliability | Platform uptime ≥ 99% during production hours over the pilot period (excluding agreed maintenance windows) | Uptime monitoring tool (e.g. Uptime Kuma or CloudWatch) |
