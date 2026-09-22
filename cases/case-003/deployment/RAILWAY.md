# Railway deployment

## Two supported Railway profiles

### A. Current-compat profile

Use this only to reproduce the existing certified runtime shape:

```text
n8n 2.38.7
SQLite
Railway Volume mounted at /home/node/.n8n
current CASE-002/CASE-003 combined Dockerfile
hosted Supabase business DB
Kapso
```

The live source currently resides on the CASE-002 runtime branch because CASE-003 was introduced additively into the already-running n8n service. Do not interpret that layout as the preferred greenfield architecture.

### B. Greenfield profile

For a new environment, prefer:

```text
n8n 2.38.7
Railway managed PostgreSQL for n8n state
Railway Volume for filesystem/binary data if used
hosted Supabase for CASE-003 state
HTTPS mail transport
```

This removes SQLite as a scaling/restore constraint while keeping CASE-003 business truth in its own database.

## Create the n8n service

1. Connect the GitHub repository.
2. Select the target branch.
3. For the portable CASE-003 image set:

```text
RAILWAY_DOCKERFILE_PATH=cases/case-003/deployment/railway/Dockerfile
```

4. Configure a public domain/custom domain.
5. Set target/listen port 5678, or set `PORT=5678` so Railway healthchecks and n8n agree.
6. Add the variables from `railway.variables.example`.
7. Add a persistent volume at `/home/node/.n8n` if filesystem binary data or local state must survive deploys.
8. Create the n8n owner account.
9. Create runtime credentials by stable name.
10. Import/render workflows only after credentials exist.
11. Run post-deploy smoke tests before enabling provider traffic.

Railway volumes persist across deploys/restarts, but they are mounted only at runtime, not during image build. Railway also prevents two active deployments from simultaneously mounting the same service volume, so a volume-backed deployment can have a short handover interruption.

## n8n internal PostgreSQL on Railway

Create a Railway PostgreSQL service and map its private values to:

```text
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST
DB_POSTGRESDB_PORT
DB_POSTGRESDB_DATABASE
DB_POSTGRESDB_USER
DB_POSTGRESDB_PASSWORD
DB_POSTGRESDB_SCHEMA=public
```

Use Railway private networking where possible. Never reuse the CASE-003 business database password for the n8n internal database.

## Current-compat SQLite volume

If restoring the current runtime:

```text
mount: /home/node/.n8n
N8N_USER_FOLDER=/home/node
DB_SQLITE_DATABASE=/home/node/.n8n/database.sqlite
```

Before every startup mutation, copy/snapshot the SQLite DB and the n8n config. The existing live entrypoint enforces this backup law.

Do not run multiple n8n replicas against the same SQLite file.

## Healthcheck

Configure a Railway healthcheck only after verifying the endpoint against the pinned n8n version. At minimum, ensure the editor/API is accepting HTTP before routing traffic. Railway expects a 2xx response during deployment health validation.

## Deploy flow

```text
backup
-> deploy image
-> wait for healthy
-> inspect n8n version
-> verify workflow count
-> verify credential metadata count/type only
-> verify provider webhook paths
-> run CASE-003 smoke
-> enable provider traffic
```

Never expose credential payloads in deploy logs.

## SMTP warning: observed real runtime behavior

The CASE-003 Gate-10 probe from the same Railway service produced:

```text
smtp.gmail.com:465 IPv4   ETIMEDOUT
smtp.gmail.com:587 IPv4   ETIMEDOUT
smtp.gmail.com:465 IPv6   ENETUNREACH
smtp.gmail.com:587 IPv6   ENETUNREACH
smtp.sendgrid.net:2525    ETIMEDOUT
smtp-relay.brevo.com:2525 ETIMEDOUT
```

Therefore this repository must not assume outbound SMTP works from Railway. The observed deployment is documented in `../runtime/evidence/gate10-email-transport-2026-09-21.md`.

On Railway, use an HTTPS mail API unless a future deployment proves SMTP connectivity from that exact service/network.

## Rollback

A code/image rollback is not automatically a state rollback.

For a volume/SQLite environment:

1. stop mutation traffic;
2. preserve the failed-state volume first;
3. restore the pre-deploy SQLite/config snapshot;
4. deploy the prior pinned image;
5. verify credential/workflow counts and webhook activation.

For PostgreSQL-backed n8n, follow `BACKUP-RESTORE.md`; do not restore an old application image against a schema that has undergone an incompatible migration without checking n8n release guidance.

## Official Railway references

- Dockerfiles: https://docs.railway.com/builds/dockerfiles
- Volumes: https://docs.railway.com/volumes
- Healthchecks: https://docs.railway.com/deployments/healthchecks
- Build/deploy: https://docs.railway.com/build-deploy
