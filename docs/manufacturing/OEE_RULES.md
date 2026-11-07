# OEE Rules and Definitions — GreyHook MES

**Version**: 0.1  
**Status**: Draft — requires manufacturing domain expert validation  
**Reference**: ISO 22400-2, SEMI E10, VDMA OEE standard  
**Date**: 2026-11-04

---

## OEE formula

```
OEE = Availability × Performance × Quality
```

## Component definitions

### Availability

Measures whether the machine was available to run when it was scheduled to run.

```
Availability = Run Time / Planned Production Time

Planned Production Time = Shift Duration - Planned Stops
Run Time = Planned Production Time - Unplanned Downtime
```

**Planned stops**: scheduled breaks, planned maintenance, shift changeover.  
**Unplanned downtime**: machine fault, material shortage, operator absence, unplanned setup.

[ASSUMPTION] Breaks are configured per shift per factory. Default: 1 × 30 min lunch, 2 × 10 min breaks for an 8-hour shift.

### Performance

Measures whether the machine ran at its intended speed when it was running.

```
Performance = (Ideal Cycle Time × Actual Count) / Run Time
           = Actual Count / (Run Time × Ideal Rate)
```

Where:
- **Ideal Cycle Time**: designed cycle time per unit (seconds/unit).
- **Ideal Rate**: designed output rate (units/hour).
- **Actual Count**: total pieces produced (good + rejected).

[ASSUMPTION] Ideal cycle time is configured per machine per product code. Must be validated against actual machine specifications.

### Quality

Measures the proportion of good parts produced.

```
Quality = Good Count / Total Count
        = (Total Count - Rejected Count) / Total Count
```

Where:
- **Total Count** = good parts + rejected/scrap parts.
- **Rejected Count** = any part that does not meet quality specification, including rework.

[ASSUMPTION] Reject detection source: either manual operator entry or automatic counter. Source must be recorded per event.

---

## Time state model

Based on SEMI E10 equipment states, simplified for SME factory use:

| State | Code | OEE impact | Description |
|-------|------|------------|-------------|
| Productive | P | Increases performance | Machine running, producing parts |
| Standby | S | Counts as idle time | Machine ready but not producing |
| Engineering | E | Planned loss | Maintenance, trials, qualification |
| Scheduled Down | SD | Not counted in Planned Production Time | Planned maintenance, breaks |
| Unscheduled Down | UD | Availability loss | Fault, material shortage, operator absence |
| Non-Scheduled | NS | Not in OEE calculation | Outside shift hours |

---

## Shift-based OEE

OEE is calculated per shift per machine. A shift is a contiguous time window defined in the `shifts` table.

Aggregation rules:
- **Hourly OEE**: calculated from machine_state_periods and production_counts within that hour.
- **Shift OEE**: sum of run_time, idle_time, fault_time, good_count, rejected_count over the shift window.
- **Daily OEE**: aggregate across all shifts in a calendar day.

---

## Downtime attribution rules

[ASSUMPTION] The following attribution rules are proposed. Must be validated with factory supervisors.

1. If a machine enters `fault` state, a downtime event is automatically opened.
2. The downtime category defaults to `Unclassified — Fault`.
3. An operator or supervisor must classify the downtime within 4 hours.
4. If unclassified after 4 hours, it remains in the `Unclassified` category for reporting.
5. Manual downtime events can be entered retroactively within the same shift.
6. Overlapping downtime events are not permitted. The earlier event must be closed first.

---

## OEE target benchmarks (industry reference)

| OEE level | Description |
|-----------|-------------|
| < 50% | Poor — significant improvement potential |
| 50–65% | Fair — typical for small manual operations |
| 65–75% | Good — achievable with focused improvement |
| > 85% | World class |

[ASSUMPTION] Pilot target: establish a baseline OEE reading for the pilot factory before setting improvement targets.

---

## Validation requirements before production

- [ ] Ideal cycle times validated against machine specifications for each product code.
- [ ] Break schedule validated against actual factory shift practices.
- [ ] Downtime categories validated against factory's existing downtime classification (if any).
- [ ] OEE formula output cross-checked against manually calculated reference values.
- [ ] Edge case tested: shift spanning midnight, machine offline for entire shift, all parts rejected.
