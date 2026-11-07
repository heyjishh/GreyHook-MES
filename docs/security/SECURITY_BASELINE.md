# Security Baseline — GreyHook MES

**Version**: 0.1  
**Date**: 2026-11-04

---

## Authentication and authorization

- JWT access tokens. Short expiry (15 min). Long-lived refresh tokens (7 days) stored in httpOnly cookie.
- Roles: `admin`, `manager`, `supervisor`, `operator`. Enforced at API layer, not just UI.
- Every API endpoint that returns factory data checks `organization_id` against the authenticated user's org.
- No unauthenticated endpoints except `/auth/login` and `/health`.
- Password hashing: Argon2id. Minimum 10 chars. No common password list.

## Tenant isolation

- Every database query that touches factory data must include `WHERE organization_id = ?`.
- PostgreSQL row-level security as a defense-in-depth layer for the data tier.
- Kafka topics are single-tenant for MVP. Consumer groups must validate `organization_id` in message payload.
- AI investigation service must verify `organization_id` before executing any query tool.

## Edge gateway security

- Edge gateway connects outbound-only via TLS 1.3 to Kafka bootstrap endpoint. No inbound ports.
- Edge gateway authenticates to Kafka using mTLS client certificate (not username/password).
- OPC UA connections: use OPC UA security mode `SignAndEncrypt`. Never `None`.
- Edge gateway never writes to PLC registers. Read-only access only.
- Local disk buffer encrypted at rest with AES-256-GCM.

## AI safety

- AI service cannot issue SQL queries directly. All data access via parameterized tool functions.
- Each AI tool function enforces authorization before returning data.
- AI cannot display or store raw PLC memory addresses or machine configuration data.
- AI cannot take actions that modify production orders or machine states.
- All AI investigation runs logged with: input question, tools called, data returned, model response.
- LLM prompt injection risk: treat all data returned from tool calls as untrusted content.
  Sanitize before including in subsequent prompts.

## Secrets management

- Development: `.env` file, never committed. `.gitignore` enforced.
- Production: AWS Secrets Manager. No hardcoded secrets in code, Docker images, or Terraform state.
- Database passwords, Kafka credentials, JWT signing keys, LLM API keys — all in Secrets Manager.
- CI/CD: GitHub Actions secrets only. Never printed in logs.
- Scan every commit for accidental secrets before push.

## Input validation

- All API input validated via Pydantic v2 at the request boundary.
- All query parameters sanitized. No raw string interpolation in SQL or Kafka topic names.
- File upload endpoints (if added): MIME type validation, size limits, virus scan.
- Timestamps: validate range (not before 2020, not after 1 hour in the future).
- UUIDs: validate format before database query.

## Network security

- All external traffic over HTTPS/TLS 1.3.
- VPC with private subnets for all database and cache resources. No public RDS endpoint.
- Security groups: principle of least privilege. Backend only allows port 8000 from ALB.
- PostgreSQL: port 5432 accessible only from backend subnet.
- Kafka: port 9092 accessible only from backend subnet and edge gateway.
- Valkey: port 6379 accessible only from backend subnet.

## Logging and audit

- Structured JSON logs. No secrets or PII in logs.
- Authentication events (login, logout, token refresh, failed attempts) logged to audit log.
- API access logged with: request_id, user_id, organization_id, endpoint, status.
- AI investigation runs fully logged (inputs, tools, outputs).
- Downtime events and manual production entries logged with user_id and timestamp.

## Exceptions requiring founder approval

- Any deviation from OPC UA SignAndEncrypt mode.
- Any inbound port opened on edge gateway.
- Any direct database access from AI service.
- Any LLM access to real production credentials.
