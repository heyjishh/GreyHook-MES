# Acceptance Criteria and Release Gates — GreyHook MES

**Version**: 0.1  
**Date**: 2026-11-04

---

## Release gates

| Gate | Evidence required | Approver |
|------|-------------------|----------|
| G1: Requirements | Stories, assumptions, acceptance criteria complete | Founder |
| G2: Architecture | ADRs, schema, API contracts frozen | Founder |
| G3: Code | Unit tests pass, lint clean, TypeScript strict | Orchestrator |
| G4: Integration | API, database, UI integration tests pass | Orchestrator |
| G5: Security | Tenant isolation, auth, secrets, input validation checked | Reviewer + Founder for exceptions |
| G6: AI quality | Evaluation report (≥100 questions), evidence checks, failure cases | Founder |
| G7: Pilot | Acceptance test results, deployment checklist complete | Founder |

---

## Technical quality targets

| Area | Target |
|------|--------|
| Backend unit tests | Critical business logic 100%; overall ≥80% |
| API contract tests | All documented endpoints pass |
| Tenant isolation | Zero unauthorized cross-tenant access in test suite |
| Duplicate ingestion | Idempotent — retries do not double-count production |
| Telemetry visibility | ≥95% of online events visible within 10 seconds |
| Data accounting | ≥99% of expected test events accounted for |
| OEE accuracy | Matches independently validated sample calculations |
| AI numerical accuracy | ≥98% on curated evaluation set |
| AI evidence coverage | 100% of factual operational claims include evidence |
| AI safety | No unsupported causal claims in release evaluation set |

---

## MVP acceptance criteria by feature

### Machine status dashboard

- [ ] All machines in the factory visible with current state.
- [ ] Machine state reflects simulated telemetry within 10 seconds.
- [ ] State history timeline shows last 8 hours.
- [ ] Machine offline state detected when no events for > 60 seconds.

### Production tracking

- [ ] Current production order visible for each line.
- [ ] Actual vs planned count updates in near real-time.
- [ ] Completion percentage shown with time remaining.
- [ ] Shift summary available after shift close.

### Downtime tracking

- [ ] Auto-detected downtime opens when machine enters fault state.
- [ ] Manual downtime entry works for supervisor.
- [ ] Downtime Pareto chart renders correctly for selected time range.
- [ ] Total downtime duration reconciles with machine state timeline.

### OEE dashboard

- [ ] Availability, Performance, Quality, OEE displayed per machine per shift.
- [ ] OEE formula matches the definition in `docs/manufacturing/OEE_RULES.md`.
- [ ] OEE output validated against 3 hand-calculated reference examples.
- [ ] Trend chart shows OEE over last 7 days.

### AI investigations

- [ ] User can type a natural language question about production.
- [ ] AI response includes observations with cited evidence (timestamp, source).
- [ ] AI clearly separates observations from hypotheses.
- [ ] AI responds with uncertainty message when data is insufficient.
- [ ] AI never claims direct causation without supporting evidence.
- [ ] Response time under 30 seconds for standard queries.
- [ ] Positive/negative feedback can be submitted.

### Security

- [ ] Operator cannot access admin or manager endpoints.
- [ ] Cross-organization data access returns 403.
- [ ] Invalid JWT returns 401.
- [ ] No secrets in source code or logs.
- [ ] All API inputs validated (SQL injection, XSS, oversized payload).

---

## AI evaluation dataset requirements

Minimum 100 test questions covering:
- Standard production queries ("What was OEE on Machine 2 yesterday?")
- Downtime analysis ("What caused the most downtime this week?")
- Cross-machine correlation ("Which downtime on Machine 1 affected Machine 3?")
- Missing data cases (machine offline, partial shift data)
- Contradictory data cases (duplicate events, overlapping downtime)
- Ambiguous root cause cases
- Questions the AI should refuse to answer (control commands, PLC writes)
- Numerical accuracy checks (OEE values, duration totals)

For each question: expected answer, expected evidence citations, expected uncertainty level.
