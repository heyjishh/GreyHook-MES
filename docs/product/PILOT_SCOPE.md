# Pilot Scope — GreyHook MES

**Version**: 0.1 Draft  
**Status**: Requires founder approval before approach to pilot factory  
**Date**: 2026-11-04

---

## Pilot objective

Validate that a factory supervisor can open the platform, identify where production was lost
in the last shift, understand the evidence, and take a better-informed action — in under 5 minutes.

## Pilot constraints

- **Duration**: 4 weeks of live operation at pilot factory.
- **Factory**: One factory, one production line, 3–5 machines.
- **Data**: Real machine data OR simulated demo data at pilot factory's choice.
- **Access**: Read-only machine connectivity. No write-back to PLCs.
- **Connectivity**: Factory internet connection + on-premises edge gateway Docker container.

## Pilot success criteria

| Criterion | Measurement |
|-----------|-------------|
| System uptime | ≥95% during scheduled production hours |
| Telemetry latency | Machine events visible in dashboard within 10 seconds |
| OEE accuracy | ≤2% deviation from manually calculated reference |
| AI response time | ≤30 seconds for standard production queries |
| Supervisor adoption | Supervisor opens platform at least once per shift |
| Positive feedback | Supervisor rates AI investigations as useful ≥70% of the time |

## What we need from the pilot factory

- [ ] Factory contact who can validate OEE and downtime definitions.
- [ ] Machine specifications (ideal cycle times, product codes).
- [ ] Shift schedule.
- [ ] Existing downtime classification (if any) to map to our taxonomy.
- [ ] IT contact for network and connectivity approval.
- [ ] Written consent for data storage and cloud processing.

## What we provide to the pilot factory

- [ ] Installed edge gateway (Docker container on factory PC).
- [ ] Cloud dashboard access (browser-based, no install).
- [ ] Training: 1-hour session for supervisor and admin.
- [ ] Support: response within 4 hours during business hours.
- [ ] Anonymized OEE report at end of pilot.

## Data and privacy commitments

[ASSUMPTION] These commitments require legal review before pilot agreement is signed.
- Factory production data stored encrypted in AWS Mumbai region (ap-south-1).
- Data retained for 90 days after pilot end unless extended.
- Data not shared with any third party.
- Factory can request data deletion at any time.
- AI model provider (Anthropic/OpenAI) processes queries but does not retain training data.
