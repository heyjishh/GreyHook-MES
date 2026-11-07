# Factory Intelligence OS — Product Vision

**Product**: GreyHook MES  
**Version**: 0.1 MVP  
**Date**: 2026-11-04

## Mission

Factory Intelligence OS gives small and medium-sized manufacturing factories in India
real-time production visibility, OEE measurement, and AI-powered root-cause investigation —
without the complexity and cost of enterprise MES systems.

## Problem

Indian SME factories (₹5–200 Cr revenue, 10–500 employees) lose 20–40% of potential
production capacity to untracked downtime, poor shift handover, and reactive maintenance.
They lack the data infrastructure to answer: "Why did we miss today's target?"

Most enterprise MES solutions cost ₹50L–5Cr to deploy and require dedicated IT teams.
Smaller factories use whiteboards, Excel, and intuition.

## Vision

A factory supervisor opens their phone and immediately sees:
- Which machines are running, idle, or faulted right now.
- How much production has been completed vs the shift target.
- Where production time was lost today, and why.
- An AI-generated investigation: evidence, hypothesis, recommended action.

## Target customer

Indian SME manufacturing factories:
- Automotive components, precision machining, plastic injection, food processing.
- 1–5 production lines.
- 5–50 machines with PLCs or sensors.
- Existing ERP (Tally, SAP B1, or none).
- No dedicated MES team.

## MVP scope

| Capability | MVP |
|------------|-----|
| Factories | 1 |
| Production lines | 1 |
| Machines | 3–5 |
| Machine connectivity | Simulated + MQTT + 1 OPC UA path |
| Production visibility | Actual vs planned, shift-level |
| Machine states | Running, Idle, Fault |
| Downtime tracking | Manual + auto-detected |
| OEE | Availability, Performance, Quality |
| AI queries | Natural language over production data |
| AI investigations | Evidence-backed root-cause analysis |
| Deployment | Cloud (AWS) + local edge gateway |

## Success metric for 12-week pilot

A factory supervisor can open the platform, identify where production was lost in the
last shift, understand the evidence behind the loss, and take a better-informed action —
in under 5 minutes, without training.

## Non-goals (v0.1)

- Multi-site, multi-factory management.
- ERP integration.
- Predictive maintenance.
- AI-issued machine commands or automated corrective actions.
- Mobile native app.
