# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `main`  | ✅ Yes    |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **security@greyhook.io** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept (no live systems — a local Docker Compose deployment is sufficient)
- The affected component (`backend`, `edge`, `frontend`, `infra`, etc.)

You will receive an acknowledgement within **48 hours** and a status update within **7 days**.

We follow responsible disclosure: we ask that you give us 90 days to release a fix before public disclosure.

## Deployment hardening checklist

Before exposing GreyHook MES to any network, confirm:

- [ ] `JWT_SECRET` is set to a random string ≥ 32 characters (`openssl rand -hex 32`)
- [ ] `POSTGRES_PASSWORD` is set to a strong value (not `devpassword` or `changeme`)
- [ ] `ENVIRONMENT=production` is set — this triggers startup validation of the above
- [ ] `CORS_ORIGINS` is set to your frontend's origin(s), comma-separated
- [ ] `GRAFANA_PASSWORD` is changed from the default
- [ ] The backend (`8000`) and Grafana (`3100`) ports are not publicly exposed; front-proxy only
- [ ] OPC-UA / MQTT edge ports are not reachable from untrusted networks
- [ ] Kafka / Redpanda ports (`9092`, `19092`) are internal only

## Security architecture notes

- All API routes except `/api/v1/auth/*` and `/api/v1/health` require a valid JWT Bearer token.
- Tenant isolation is enforced at the query layer: every row is scoped to `organization_id` from the authenticated user's token.
- Role-based access control (`admin`, `manager`, `supervisor`, `operator`) is enforced server-side via FastAPI dependencies — not in the UI.
- The SSE endpoint authenticates via a short-lived token passed as a query parameter (required because `EventSource` cannot set custom headers).
- All mutating API calls (`POST`, `PUT`, `PATCH`, `DELETE`) are recorded in the `audit_log` table with user ID, organization ID, IP address, and request ID.
- CORS defaults to no origins in production; set `CORS_ORIGINS` explicitly.

## Known limitations

- Audit log immutability is enforced by the ORM layer only; a database admin can alter rows directly. Database-level row-security or an append-only audit table is a planned improvement.
- E-signatures and 21 CFR Part 11 / GAMP 5 compliance are not implemented.
