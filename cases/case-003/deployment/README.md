# CASE-003 deployment handbook

This directory is the portable operations handbook for CASE-003. Its purpose is to let an operator rebuild the runtime on Railway, a VPS, a Linux VM, a local Linux host, or another Docker-capable platform without depending on tribal knowledge from the original deployment.

The source of truth remains the repository. Secrets, credential payloads, OTPs and customer data do not belong in Git.

## What is portable

CASE-003 separates four concerns:

```text
WhatsApp / provider
        |
        v
n8n runtime --------------------+
        |                       |
        v                       v
CASE-003 control/business DB   mail transport
(Supabase/PostgreSQL)          (SMTP or HTTPS API)
```

The database is authoritative for business state, identity, challenge lifecycle, replay/idempotency and authorization. n8n is the orchestration runtime. Provider credentials are adapters. Mail delivery is a transport boundary.

## Deployment profiles

| Profile | n8n state DB | CASE-003 business DB | Mail | Status |
|---|---|---|---|---|
| Railway current-compat | SQLite on Railway volume | hosted Supabase | SMTP credential exists, SMTP egress blocked | closest to current certified runtime |
| Railway greenfield | managed PostgreSQL recommended | hosted Supabase | HTTPS mail API recommended | portable target |
| VPS / VM Linux | PostgreSQL in Compose or managed PostgreSQL | hosted Supabase | SMTP or HTTPS | portable target |
| Local Linux | PostgreSQL in Compose | hosted Supabase or local dev DB | local/test transport | development only |
| Plain PostgreSQL business DB | PostgreSQL | plain PostgreSQL | transport-independent | core SQL portable; full Gate-9/10 adapter parity must be re-certified |

The currently certified provider path uses Supabase/PostgREST RPC adapters. The core SQL is portable PostgreSQL, but moving the business database away from Supabase is not automatically equivalent to the currently certified Gate-9/10 runtime.

## Read in this order

1. [PORTABILITY-MATRIX.md](PORTABILITY-MATRIX.md)
2. [ENVIRONMENT-CONTRACT.md](ENVIRONMENT-CONTRACT.md)
3. target platform:
   - [RAILWAY.md](RAILWAY.md)
   - [LINUX-DOCKER.md](LINUX-DOCKER.md)
   - [BARE-METAL-LINUX.md](BARE-METAL-LINUX.md)
4. [DATABASE.md](DATABASE.md)
5. [SECRETS-CREDENTIALS.md](SECRETS-CREDENTIALS.md)
6. [MAIL-TRANSPORT.md](MAIL-TRANSPORT.md)
7. [BACKUP-RESTORE.md](BACKUP-RESTORE.md)
8. [UPGRADE-ROLLBACK.md](UPGRADE-ROLLBACK.md)
9. [OBSERVABILITY-INCIDENTS.md](OBSERVABILITY-INCIDENTS.md)
10. [PORTABILITY-CHECKLIST.md](PORTABILITY-CHECKLIST.md)

## Files ready to use

- `docker-compose.yml` — single-host n8n + PostgreSQL + Caddy baseline.
- `.env.example` — environment contract without secrets.
- `Caddyfile.example` — TLS reverse proxy example.
- `railway.variables.example` — Railway variable inventory.
- `scripts/preflight.sh` — non-secret host/config checks.
- `scripts/backup-compose.sh` — local/VPS backup helper.
- `scripts/smoke-http.sh` — post-deploy HTTP checks.

## Frozen invariants

- Pin n8n; never deploy `latest`.
- Preserve `N8N_ENCRYPTION_KEY`; changing it breaks stored credentials.
- Back up before mutation, migration, import, publish, upgrade or restore.
- Never treat RUC/tax ID as authentication.
- Never store raw OTP in PostgreSQL, evidence, logs or Git.
- Never commit a full trusted-contact or test email address.
- Never change the SAP snapshot trusted contact to make a test pass.
- CASE-003 business state is not owned by n8n.
- n8n internal persistence and CASE-003 business persistence are separate concerns.
- A deployment is not certified until post-deploy smoke tests and the relevant gate evidence pass.

## Current reference version

```text
n8n image: n8nio/n8n:2.38.7
timezone: America/Lima
CASE-003 runtime manifest: ../runtime/manifest.json
```

The version is intentionally pinned to match the real certified runtime. Upgrade only through [UPGRADE-ROLLBACK.md](UPGRADE-ROLLBACK.md).

## Primary external references

- n8n self-hosting documentation: https://docs.n8n.io/
- n8n security audit: https://docs.n8n.io/hosting/securing/security-audit/
- Railway Dockerfiles: https://docs.railway.com/builds/dockerfiles
- Railway volumes: https://docs.railway.com/volumes
- Railway healthchecks: https://docs.railway.com/deployments/healthchecks
- Supabase migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase backups: https://supabase.com/docs/guides/platform/backups
- Supabase production checklist: https://supabase.com/docs/guides/deployment/going-into-prod
