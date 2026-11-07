# User Stories — GreyHook MES MVP

**Version**: 0.1  
**Status**: IN_REVIEW  
**Date**: 2026-11-04  
**Owner**: Agent 1 — Product & Manufacturing Architect

Stories are numbered US-001 through US-025. All stories are aligned with the API contract in `docs/architecture/API_CONTRACT.md`.

---

## US-001 — Add a machine to the factory

**As a** Factory Admin  
**I want to** add a new machine to a production line with its name, type, and connectivity protocol  
**So that** the machine appears in the live status view and its data can be tracked

**Acceptance criteria**:
- Given I am logged in as an admin and a production line exists, when I submit a new machine with name, machine_type, and protocol (`simulated`, `mqtt`, or `opcua`), then the machine is created and appears with state `offline` in GET /factories/{factory_id}/machines
- Given I submit a new machine without selecting a protocol, when the form is submitted, then the system defaults to `simulated` and saves successfully
- Given a machine with the same name already exists on the same production line, when I attempt to add it, then the system returns a VALIDATION_ERROR and does not create a duplicate
- Given I am logged in as a supervisor (not admin), when I attempt to access the machine configuration page, then I am shown a "Permission denied" message and the action is blocked

**Priority**: Must Have  
**Feature**: F01  
**Notes**: Machine creation uses POST implied by GET /factories/{factory_id}/machines contract. Deactivation, not deletion, is required when records exist.

---

## US-002 — Configure a shift schedule

**As a** Factory Admin  
**I want to** define a shift schedule with start time, end time, and planned stop windows  
**So that** OEE calculations use the correct Planned Production Time for each shift

**Acceptance criteria**:
- Given I am logged in as admin, when I create a shift with start 06:00, end 14:00, one 30-min lunch break and two 10-min breaks, then Planned Production Time is calculated as 480 − 50 = 430 minutes
- Given I configure a night shift that starts at 22:00 and ends at 06:00 the next day, when the shift is saved, then the system stores the end time on the following calendar date and shift summary attributes to the start date
- Given I leave the planned stops section empty, when I save the shift, then the system accepts it and uses the full shift duration as Planned Production Time
- Given a shift schedule is in use by an active production order, when I attempt to delete it, then the system returns an error and the schedule is preserved

**Priority**: Must Have  
**Feature**: F01  
**Notes**: Midnight-spanning shifts are an edge case that affects OEE aggregation across F03 and F05. [ASSUMPTION] shift start date is used as the attribution date.

---

## US-003 — Manage user accounts and roles

**As a** Factory Admin  
**I want to** create user accounts and assign each user a role  
**So that** each person can only perform actions appropriate to their responsibility

**Acceptance criteria**:
- Given I create a user with role `operator`, when that user logs in, then they can view machine status and log downtime but cannot access factory configuration or OEE trend reports
- Given I create a user with role `supervisor`, when that user logs in, then they can view all dashboards, log and categorize downtime, and close shifts, but cannot add or delete machines
- Given I create a user with role `manager`, when that user logs in, then they can view all dashboards, OEE trends, and AI investigations, but cannot modify factory configuration
- Given I attempt to create a user with an email that already exists in the system, when I submit the form, then the system returns VALIDATION_ERROR and does not create a duplicate account

**Priority**: Must Have  
**Feature**: F01  
**Notes**: Roles map to the `UserSchema.role` field in the API contract: `admin | manager | supervisor | operator`.

---

## US-004 — See real-time machine status for all machines

**As a** Production Supervisor  
**I want to** open the factory dashboard and immediately see the current state of every machine  
**So that** I can identify at a glance which machines are running, idle, faulted, or offline

**Acceptance criteria**:
- Given I am a supervisor and I log in during an active shift, when the dashboard loads, then I see each machine's current state (running / idle / fault / offline) and the time elapsed in that state, all within 2 seconds
- Given a machine transitions from running to fault, when the transition occurs, then the machine's state updates on my screen within 10 seconds without requiring a page refresh (via SSE /sse/machines/{factory_id}/status)
- Given a machine has had no telemetry for more than 60 seconds, when I view the dashboard, then the machine is shown as `offline` with the timestamp of the last received event
- Given I am a manager viewing the dashboard on my phone, when I open it, then I see the same machine statuses as the supervisor view

**Priority**: Must Have  
**Feature**: F02  
**Notes**: State updates delivered via Server-Sent Events per the API contract. Offline detection threshold of 60 seconds is [ASSUMPTION].

---

## US-005 — Receive an alert when a machine goes offline

**As a** Production Supervisor  
**I want to** receive an in-app alert when any machine transitions to offline or fault state  
**So that** I can respond immediately without waiting for an operator to walk over and tell me

**Acceptance criteria**:
- Given a machine transitions to fault, when the transition is detected, then an alert notification appears in the platform for all logged-in supervisors and admins within 60 seconds
- Given a machine has been offline for more than 60 seconds, when the platform detects no telemetry, then the machine is marked offline and an alert fires
- Given a machine goes offline for 45 seconds and then recovers, when telemetry resumes, then no offline alert is triggered and the brief gap is recorded in the state timeline but not escalated
- Given I have already seen and acknowledged a fault alert, when I navigate to another page, then the alert is not shown again for the same event

**Priority**: Must Have  
**Feature**: F02  
**Notes**: Alert mechanism is in-app for MVP. Push notifications and SMS are out of scope.

---

## US-006 — View machine state history timeline

**As a** Production Supervisor  
**I want to** see a timeline of machine state changes over the last 8 hours  
**So that** I can understand patterns of fault and idle time without reading through raw event logs

**Acceptance criteria**:
- Given I select a machine, when I view its history, then I see a timeline showing state segments (running, idle, fault, offline) with start and end times, covering at least the last 8 hours
- Given a machine was in fault state from 09:15 to 09:37, when I view the timeline, then the fault segment is shown with 22-minute duration labeled
- Given I am a machine operator viewing my own machine, when I access the history view, then I see the same timeline as the supervisor sees for that machine
- Given a machine had no events in the last 8 hours, when I view its timeline, then I see a single offline segment covering the full period with "No telemetry received" label

**Priority**: Must Have  
**Feature**: F02  
**Notes**: Data sourced from GET /machines/{machine_id}/events with a time range of last 8 hours.

---

## US-007 — View current production progress against shift target

**As a** Production Supervisor  
**I want to** see the current actual production count versus the planned shift target, with a progress percentage and estimated completion time  
**So that** I know whether we are on track and can take action if we are falling behind

**Acceptance criteria**:
- Given an active shift with planned_qty=500 and actual_qty=312, when I view the production dashboard, then I see: Actual 312, Planned 500, Progress 62.4%, and an estimated completion time based on current rate
- Given no parts have been produced yet (actual_qty=0), when I view estimated completion, then no estimate is shown and the field displays "—"
- Given actual_qty exceeds planned_qty (e.g. 510/500), when I view the dashboard, then progress shows 102% and estimated completion shows "Target exceeded"
- Given I am logged in as Plant Manager and it is mid-shift, when I open the production page, then I see the same current progress data as the supervisor

**Priority**: Must Have  
**Feature**: F03  
**Notes**: Data from GET /lines/{line_id}/production/current. Completion time formula: shift_start + (elapsed_time / actual_qty × planned_qty).

---

## US-008 — View shift production summary at shift end

**As a** Plant Manager  
**I want to** see a complete shift summary including planned vs actual, good vs rejected, and downtime totals when a shift closes  
**So that** I have a structured record of each shift's performance without relying on supervisor WhatsApp messages

**Acceptance criteria**:
- Given a shift has ended, when I open the shift summary, then I see: planned_qty, actual_qty, good_qty, rejected_qty, total_downtime_minutes, and the top 3 downtime categories by duration
- Given a shift ended with actual_qty below planned_qty, when I view the summary, then a production miss is flagged with the gap quantity
- Given a shift had all units produced rejected (quality = 0%), when I view the summary, then good_qty shows 0 and a "Quality: 0.0%" label is displayed prominently
- Given I request the history via GET /lines/{line_id}/production/history?granularity=shift, when the API responds, then each past shift appears as a row with its summary data

**Priority**: Must Have  
**Feature**: F03  
**Notes**: Zero-quality edge case must not cause a division-by-zero error. OEE_RULES.md specifies Quality = Good Count / Total Count; if Total Count = 0, Quality is undefined ("—").

---

## US-009 — Log a production count manually

**As a** Machine Operator  
**I want to** enter the number of parts I have produced when my machine does not have an automatic counter  
**So that** production tracking stays accurate even on machines without telemetry integration

**Acceptance criteria**:
- Given I am logged in as an operator and my machine does not emit automatic count events, when I submit a manual count entry with quantity and timestamp, then the actual_qty for the current production order increments accordingly
- Given I enter a negative count, when I attempt to submit, then the system returns a VALIDATION_ERROR and no data is changed
- Given I submit a manual count at 13:50 during a shift that runs until 14:00, when the entry is saved, then it is attributed to the current shift and appears in the shift summary
- Given I am a supervisor, when I view the production dashboard, then I can see which count events were manually entered (source label: "manual") versus automatically detected

**Priority**: Must Have  
**Feature**: F03  
**Notes**: Manual entry source must be recorded per count event for data quality reporting. Source differentiation aligns with OEE_RULES.md reject detection source requirement.

---

## US-010 — View auto-detected downtime events

**As a** Production Supervisor  
**I want to** see downtime events that were automatically detected when machines faulted  
**So that** no downtime goes unrecorded even if I was not watching the dashboard at the moment it occurred

**Acceptance criteria**:
- Given machine M001 transitioned to fault at 07:45 and recovered at 08:07, when I view the downtime list, then one event appears with started_at 07:45, ended_at 08:07, duration 22 minutes, category "UC — Unclassified"
- Given a downtime event is auto-detected, when I view it, then it shows is_planned=false and a "Categorize" action button
- Given I filter downtime events by GET /machines/{machine_id}/downtime?from=...&to=..., when the response arrives, then only events within that time window are returned
- Given a machine entered fault state at shift end and has not recovered, when I view the downtime list, then the event is shown as open (ended_at: null)

**Priority**: Must Have  
**Feature**: F04  
**Notes**: Auto-detection triggers on `fault` and `offline` state transitions. Downtime data from GET /machines/{machine_id}/downtime.

---

## US-011 — Categorize a downtime event

**As a** Production Supervisor  
**I want to** assign a downtime category and reason to an open or unclassified downtime event  
**So that** the downtime Pareto chart reflects accurate root causes and future analysis is meaningful

**Acceptance criteria**:
- Given an unclassified downtime event exists, when I select category ME-01 (Mechanical failure) and submit, then the event is updated with that category and no longer appears in the unclassified bucket
- Given a downtime event lasted 35 minutes (Major severity), when I attempt to save without entering a reason text, then the system returns a VALIDATION_ERROR requiring the reason field
- Given I am an operator, when I attempt to categorize a downtime event, then the system allows the action (operators may categorize their own machine's downtime) [ASSUMPTION — to validate with factory workflow]
- Given a downtime event occurred 5 hours ago and has not been categorized, when I view it, then it displays a "Overdue — categorization required" label

**Priority**: Must Have  
**Feature**: F04  
**Notes**: 4-hour categorization window is [ASSUMPTION]. Major severity (> 30 min) requires reason field per DOWNTIME_TAXONOMY.md.

---

## US-012 — Log a downtime event manually after the fact

**As a** Machine Operator  
**I want to** log a downtime reason for a stop that happened earlier in the shift but was not automatically captured  
**So that** the downtime record is complete even if the machine was not in fault state during that stop

**Acceptance criteria**:
- Given I am an operator and it is 11:00 in a shift that started at 06:00, when I submit a manual downtime event with started_at 09:30, ended_at 09:48, category MA-01, then the event is accepted and appears in the downtime list
- Given I attempt to log a manual downtime event from yesterday's shift, when I submit it, then the system rejects it with VALIDATION_ERROR: "Retroactive entry allowed within current shift only"
- Given a manual downtime event I am trying to log overlaps an existing auto-detected event, when I submit it, then the system returns VALIDATION_ERROR listing the conflicting event ID and time range
- Given I log a downtime event that covers a period when the machine was in running state, when the entry is saved, then a warning is recorded (but the entry is accepted) so a supervisor can review the data inconsistency

**Priority**: Must Have  
**Feature**: F04  
**Notes**: Retroactive entry is restricted to the current shift per OEE_RULES.md downtime attribution rule 5. The overlap check must use started_at and ended_at.

---

## US-013 — View downtime Pareto chart for a shift

**As a** Plant Manager  
**I want to** see a ranked chart of downtime causes ordered by total duration for the current or past shift  
**So that** I can focus improvement effort on the most impactful downtime category

**Acceptance criteria**:
- Given a shift with three downtime events (ME-01: 22 min, MA-01: 18 min, CH-04: 15 min), when I view the Pareto chart, then categories are sorted by duration descending with ME-01 first
- Given I request the Pareto for a date range via GET /lines/{line_id}/downtime/pareto?from=...&to=..., when the API responds, then each row includes category, duration_s, event_count, and pct of total downtime
- Given all downtime events in a period are unclassified, when I view the Pareto chart, then "UC — Unclassified" appears as a single bar representing 100% of the downtime
- Given a shift had no downtime events, when I view the Pareto chart for that shift, then an empty state message is shown: "No downtime recorded for this period"

**Priority**: Must Have  
**Feature**: F04  
**Notes**: Pareto data from GET /lines/{line_id}/downtime/pareto. Planned stops (PM, BK) are displayed separately from unplanned downtime.

---

## US-014 — View OEE components for a machine for the current shift

**As a** Production Supervisor  
**I want to** see Availability, Performance, Quality, and OEE for each machine for the current shift  
**So that** I can tell at a glance which OEE component is dragging performance and investigate the right area

**Acceptance criteria**:
- Given machine M001 has completed its shift with run_time=375 min, planned_production_time=430 min, actual_count=440, ideal_cycle_time=50 sec/unit, good_count=428, when I view OEE, then Availability=87.2%, Performance=91.4%, Quality=97.3%, OEE=77.7%
- Given ideal cycle time has not been configured for a machine, when I view the OEE panel, then Performance and OEE show "—" with a tooltip: "Configure ideal cycle time to calculate Performance"
- Given a machine was offline for the entire planned shift (run_time=0), when I view OEE, then Availability=0.0%, Performance and Quality display as "—", OEE=0.0%
- Given all units produced were rejected (rejected_qty = actual_qty), when I view OEE, then Quality=0.0% and OEE=0.0% are displayed with no division-by-zero error

**Priority**: Must Have  
**Feature**: F05  
**Notes**: OEE formula from OEE_RULES.md. API data from GET /machines/{machine_id}/oee?granularity=shift. All-rejection edge case must not produce NaN or error.

---

## US-015 — View 7-day OEE trend for a machine

**As a** Plant Manager  
**I want to** see a trend chart of OEE over the last 7 days for each machine  
**So that** I can identify whether performance is improving or declining and spot patterns by day of week

**Acceptance criteria**:
- Given machine M001 has 7 complete days of shift data, when I open the OEE trend view, then I see a line chart with one point per shift (or per day, configurable) spanning the last 7 calendar days
- Given the platform has only 2 days of data for a machine, when I request the 7-day trend, then the chart shows 2 data points and gaps for the remaining 5 days — not zeros
- Given I select "last 7 days" for GET /machines/{machine_id}/oee?from=...&to=...&granularity=shift, when the API responds, then items are ordered chronologically and include all three OEE components per period
- Given I am a supervisor (not a manager), when I access the 7-day trend, then I can view it; the trend is not restricted to managers

**Priority**: Must Have  
**Feature**: F05  
**Notes**: Trend chart data from GET /machines/{machine_id}/oee. Missing data days must render as gaps, not interpolated values, to avoid misleading the manager.

---

## US-016 — View shift comparison OEE

**As a** Plant Manager  
**I want to** see how today's shift OEE compares to the same shift yesterday and to the 7-day average  
**So that** I can quickly judge whether today is better or worse than recent history without calculating it myself

**Acceptance criteria**:
- Given today's day shift has OEE=77.7%, yesterday's day shift had OEE=81.3%, and the 7-day average is 79.1%, when I view the shift comparison panel, then all three values are displayed side by side with delta indicators (▼3.6pp vs yesterday, ▼1.4pp vs 7-day avg)
- Given yesterday's shift data does not exist (e.g. factory was closed), when the comparison is shown, then "Yesterday: no data" is displayed and the 7-day average is calculated from available data points only
- Given I view the comparison panel for a machine that was added yesterday and has only 1 shift of data, when I request the comparison, then only today's value is shown; "7-day avg: insufficient data" is displayed
- Given I am a supervisor viewing the shift comparison, when I see a large negative delta, then I can click through to the OEE detail view for that machine to investigate

**Priority**: Should Have  
**Feature**: F05  
**Notes**: Comparison uses GET /lines/{line_id}/oee/summary with date range parameters for prior periods.

---

## US-017 — Ask a natural language question about production data

**As a** Production Supervisor  
**I want to** type a question like "Why did Machine M001 lose production in the morning shift today?" and receive a structured answer  
**So that** I can quickly understand what happened without manually correlating machine events, downtime logs, and production counts

**Acceptance criteria**:
- Given I submit the question "Why did Machine M001 lose production between 07:00 and 09:00?" with machine_id and time range context, when the investigation completes, then the response includes a summary, at least one observation with cited evidence, at least one hypothesis with a confidence level, and at least one recommendation
- Given the investigation is processing, when I check GET /ai/investigations/{id} and status is "pending", then the UI shows "Still analyzing..." with an elapsed time indicator
- Given the investigation completes within 30 seconds, when I view the result, then each observation cites at least one evidence item with source, value, and timestamp traceable to backend data
- Given I submit the same question for a machine with no events in that time range, when the investigation completes, then the response explicitly states "No production or downtime data found for Machine M001 in the requested period" rather than fabricating observations

**Priority**: Must Have  
**Feature**: F06  
**Notes**: Investigation submitted via POST /ai/investigations. Result retrieved via GET /ai/investigations/{id}. Status polling or SSE is an implementation detail for Agent 2.

---

## US-018 — AI investigation acknowledges missing data

**As a** Plant Manager  
**I want to** receive an explicit acknowledgment when I ask the AI about a time range where data is missing or incomplete  
**So that** I know the analysis is partial and can account for the gap when making decisions

**Acceptance criteria**:
- Given telemetry was absent for machine M002 between 10:00 and 10:45 (45-minute gap), when I ask the AI about machine performance between 09:00 and 12:00, then the response includes a statement: "Data is unavailable for 10:00–10:45. The following analysis is based on available data from 09:00–10:00 and 10:45–12:00."
- Given I ask about a 24-hour period where the factory was completely offline (no telemetry at all), when the investigation completes, then the AI returns a response acknowledging no data is available and no analysis is fabricated
- Given the investigation covers a period with partial data gaps (< 15 minutes of missing telemetry), when the response arrives, then the AI may proceed without flagging the gap, as minor gaps are within acceptable data quality thresholds [ASSUMPTION — 15-minute threshold]
- Given I receive an investigation with an acknowledged data gap, when I read the recommendations, then no recommendation is based on inferences from the missing period

**Priority**: Must Have  
**Feature**: F06  
**Notes**: 15-minute gap threshold is [ASSUMPTION]. The AI must cite only data it has access to; hallucinated observations are a failure condition.

---

## US-019 — AI refuses a machine command request

**As any user**  
**I want to** receive a clear and helpful refusal when I ask the AI to perform an action on a machine  
**So that** I understand what the AI can and cannot do, and I know who to contact to perform the actual action

**Acceptance criteria**:
- Given I ask "Stop machine M001 immediately", when the AI processes the request, then it responds: "I can only observe and analyze production data. I cannot control machines. Please contact your supervisor or use the machine's physical controls."
- Given I ask "Reset the fault on M003", when the AI processes the request, then it refuses with the same message and does not attempt to call any machine control endpoint
- Given I ask "Increase the target speed on the CNC lathe", when the AI processes the request, then it refuses and suggests I consult the machine operator or supervisor
- Given the AI refuses a command, when I look at the investigation result, then no machine state has been changed and no POST to any machine endpoint has been made

**Priority**: Must Have  
**Feature**: F06  
**Notes**: This is a hard safety requirement. The AI must never issue commands to machines, modify production data, or simulate actions. This constraint applies regardless of how the question is phrased.

---

## US-020 — Submit feedback on an AI investigation

**As a** Production Supervisor  
**I want to** rate an AI investigation as helpful or unhelpful with an optional comment  
**So that** the team can track investigation quality and improve the AI over time

**Acceptance criteria**:
- Given an investigation has completed, when I click the thumbs-up button, then POST /ai/investigations/{id}/feedback is called with feedback="positive" and the UI confirms: "Feedback recorded — thank you."
- Given I click thumbs-down and add the comment "The recommendation was not relevant to our machine type", when I submit, then the feedback is recorded with feedback="negative" and my comment
- Given I have already submitted feedback for an investigation, when I attempt to submit again, then the UI shows my existing rating and the feedback buttons are disabled
- Given I am a machine operator, when I view an AI investigation result, then I can see the analysis but the feedback buttons are only available to supervisors and managers [ASSUMPTION — feedback access level to validate]

**Priority**: Should Have  
**Feature**: F06  
**Notes**: Feedback API is POST /ai/investigations/{id}/feedback per the API contract.

---

## US-021 — Supervisor logs in and sees today's shift status immediately

**As a** Production Supervisor  
**I want to** open the platform at the start of my shift and immediately see the current state of all machines and production progress  
**So that** I am up to speed within seconds and can begin managing the shift without navigating through menus

**Acceptance criteria**:
- Given I am a supervisor and I log in during an active shift, when the dashboard loads, then I see machine statuses, the current production order actual vs planned, and any open downtime events — all within 2 seconds
- Given the previous shift ended and no new shift has started, when I log in, then I see the last completed shift summary and a "No active shift" banner
- Given there are open uncategorized downtime events from the current shift, when I log in, then a prominent notification tells me: "2 downtime events need categorization"
- Given I am a supervisor for Line 1 only, when I view the dashboard, then I see only Line 1 machines and production data [ASSUMPTION — line-scoped supervisor access, to validate]

**Priority**: Must Have  
**Feature**: F02, F03  
**Notes**: This is the primary happy-path scenario for the supervisor persona. Dashboard data sources: GET /factories/{factory_id}/machines/status and GET /lines/{line_id}/production/current.

---

## US-022 — Plant manager reviews last 7 days OEE trend

**As a** Plant Manager  
**I want to** open the OEE dashboard and see the 7-day trend for all machines in one view  
**So that** I can make an informed decision about where to focus improvement efforts this week

**Acceptance criteria**:
- Given I am logged in as a manager, when I open the OEE dashboard and select "Last 7 days", then I see OEE trend charts for all active machines covering the full 7-day period
- Given a machine was added 3 days ago, when I view its 7-day trend, then 3 days of data are shown and the prior 4 days show as "No data" in the chart
- Given I click on a specific day's OEE data point, when the drilldown opens, then I see that shift's Availability, Performance, and Quality components and can navigate to the downtime events for that shift
- Given all three machines had OEE above 75% for the full 7 days, when I view the trend, then all data points are shown in green; no amber or red indicators appear

**Priority**: Must Have  
**Feature**: F05  
**Notes**: Data from GET /machines/{machine_id}/oee?from=...&to=...&granularity=shift for each machine.

---

## US-023 — Factory admin adds a new machine mid-pilot

**As a** Factory Admin  
**I want to** add a new machine to an existing production line without disrupting data already recorded for other machines  
**So that** I can expand the system to cover additional machines as the pilot progresses

**Acceptance criteria**:
- Given two machines already have 10 days of production history, when I add a third machine to the same production line, then the existing machines' history is unaffected and the new machine appears in the status view with state "offline"
- Given I add the new machine and configure it with protocol=simulated, when the simulated data feed starts, then the machine begins emitting state events and its status updates on the dashboard within 10 seconds
- Given I add a machine but do not configure ideal cycle time, when I view OEE for that machine, then Performance displays "—" with a tooltip prompting configuration
- Given I am a supervisor attempting to add a machine, when I navigate to the machine configuration page, then I am shown "Permission denied" — only admins can add machines

**Priority**: Must Have  
**Feature**: F01  
**Notes**: Machine addition must be non-destructive to existing data. This is a common mid-pilot scenario that must be tested explicitly.

---

## US-024 — View production summary for a date range

**As a** Plant Manager  
**I want to** retrieve production history for the last 7 shifts with granularity set to shift  
**So that** I can analyze weekly production trends and present data to customers or the factory owner

**Acceptance criteria**:
- Given I request GET /lines/{line_id}/production/history?from=...&to=...&granularity=shift, when the API responds, then each shift appears as a row with planned_qty, actual_qty, good_qty, rejected_qty, and shift_start/shift_end timestamps
- Given a shift spanned midnight, when it appears in the history, then it is listed under its start date and the full planned and actual quantities are attributed to that single shift record
- Given a shift was cancelled or no production order was active, when it appears in the history, then it shows planned_qty=0 and actual_qty=0 with a "No active order" note
- Given I export or print the history view, when the data is rendered, then timestamps are displayed in IST (UTC+5:30)

**Priority**: Should Have  
**Feature**: F03  
**Notes**: Data from GET /lines/{line_id}/production/history. Midnight-shift attribution uses shift start date per F01 configuration rule.

---

## US-025 — Machine operator sees current target on their machine view

**As a** Machine Operator  
**I want to** see the current production order target and how many parts I have made so far in this shift  
**So that** I can self-manage my pace without having to ask a supervisor

**Acceptance criteria**:
- Given I am logged in as an operator assigned to machine M001, when I view the machine page, then I see: current product code, planned_qty for this shift, actual_qty so far, and a progress indicator
- Given I have produced 440 out of 500 planned, when I view the page, then I see "440 / 500 (88%)" and the remaining count "60 to go"
- Given the shift target has been met (actual_qty >= planned_qty), when I view the page, then I see a "Target reached" indicator and the final count
- Given no production order is active on my line, when I open the machine page, then I see "No active production order" and the page does not show a progress bar

**Priority**: Must Have  
**Feature**: F03  
**Notes**: Data from GET /lines/{line_id}/production/current. The operator view is a simplified subset of the supervisor production view — same API, reduced UI.
