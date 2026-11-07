# Downtime Taxonomy — GreyHook MES

**Version**: 0.1  
**Status**: Draft — requires factory field validation  
**Date**: 2026-11-04

[ASSUMPTION] This taxonomy is proposed based on common SME manufacturing practices.
Validate with at least three factory supervisors before freezing.

---

## Top-level categories

| Code | Category | Planned? | OEE impact |
|------|----------|----------|------------|
| ME | Machine / Equipment | Unplanned | Availability loss |
| MA | Material / Supply | Unplanned | Availability loss |
| OP | Operator / Labor | Unplanned | Availability loss |
| QA | Quality / Inspection | Unplanned | Availability loss |
| CH | Changeover / Setup | Planned | Availability loss |
| PM | Planned Maintenance | Planned | Not counted |
| BK | Scheduled Break | Planned | Not counted |
| UC | Unclassified | Unknown | Availability loss |

---

## Sub-categories

### ME — Machine / Equipment

| Code | Sub-category | Description |
|------|--------------|-------------|
| ME-01 | Mechanical failure | Bearing, gear, belt, axis failure |
| ME-02 | Electrical failure | Motor, sensor, relay, wiring fault |
| ME-03 | Hydraulic / pneumatic | Pressure loss, leak, actuator failure |
| ME-04 | Tooling failure | Broken tool, tool wear, insert change |
| ME-05 | Software / CNC fault | Program error, controller fault |
| ME-06 | Safety interlock | E-stop, guard open, light curtain |
| ME-07 | Calibration required | Out-of-spec measurement |
| ME-08 | Unknown machine fault | Auto-detected fault, unclassified |

### MA — Material / Supply

| Code | Sub-category |
|------|--------------|
| MA-01 | Raw material shortage |
| MA-02 | Wrong material loaded |
| MA-03 | Material quality rejection (incoming) |
| MA-04 | WIP shortage (upstream line starved) |
| MA-05 | Coolant / consumable replenishment |

### OP — Operator / Labor

| Code | Sub-category |
|------|--------------|
| OP-01 | Operator absent — no coverage |
| OP-02 | Operator training / observation |
| OP-03 | Waiting for instructions / drawing |
| OP-04 | Waiting for quality approval |

### QA — Quality / Inspection

| Code | Sub-category |
|------|--------------|
| QA-01 | First-article inspection |
| QA-02 | In-process quality hold |
| QA-03 | Rework / correction in process |
| QA-04 | Gauge / measuring equipment issue |

### CH — Changeover / Setup

| Code | Sub-category |
|------|--------------|
| CH-01 | Product changeover |
| CH-02 | Tool / fixture change |
| CH-03 | Program change |
| CH-04 | Trial run / first-off |

### PM — Planned Maintenance

| Code | Sub-category |
|------|--------------|
| PM-01 | Scheduled preventive maintenance |
| PM-02 | Lubrication / cleaning |
| PM-03 | Planned upgrade / modification |

---

## Severity classification

| Severity | Duration | Action |
|----------|----------|--------|
| Minor | < 5 min | Log only |
| Moderate | 5–30 min | Log + category required |
| Major | > 30 min | Log + category + root cause required |
| Critical | > 2 hr | Immediate supervisor escalation |

[ASSUMPTION] Duration thresholds to be validated against factory norms.
