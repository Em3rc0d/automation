# CASE-003 portability note for the live Railway source branch

The current Railway service is intentionally sourced from this CASE-002 branch because CASE-003 was introduced additively into the existing n8n runtime.

This directory is therefore a **live compatibility implementation**, not the canonical greenfield deployment layout.

Canonical CASE-003 deployment documentation is maintained on:

```text
branch: case-003/s4hana-report-supplier-self-service
path:   cases/case-003/deployment/
```

That handbook covers:

```text
Railway greenfield deployment
current Railway SQLite compatibility profile
VPS / VM Linux
Docker Compose + Caddy
bare-metal exception path
n8n PostgreSQL state
Supabase CASE-003 state
credentials/secrets
SMTP vs HTTPS mail transport
backup/restore
migration/cutover
upgrade/rollback
scaling
observability/incidents
post-deploy certification
```

## Live invariants

For this branch/service specifically:

- n8n is pinned to 2.38.7;
- persisted n8n state is on the Railway volume;
- backup-before-mutation is mandatory;
- CASE-002 continuity must not be broken by CASE-003 changes;
- CASE-003 Supabase remains the business-state authority;
- Gate-10 SMTP egress from this Railway runtime has been proven unavailable on tested ports;
- one-shot test flags stay false unless explicitly approved;
- no raw OTP/test address/credential value is committed or logged.

When rebuilding on another host, use the canonical handbook rather than copying this combined CASE-002 entrypoint as the starting architecture.
