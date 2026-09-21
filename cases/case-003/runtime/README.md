# CASE-003 portable runtime

This directory is the reproducible runtime bundle for CASE-003 on Linux.

## Invariants

- PostgreSQL/Supabase is the durable source of truth.
- n8n is an orchestrator, not the database.
- Importing the CASE-003 workflow is additive-only.
- The workflow is imported **inactive**.
- Existing n8n workflows and credentials must not be edited or deleted.
- A consistent n8n backup is required immediately before any import.
- The canonical schema is owned by `../build/canonical-model.sql`.
- Notification reservation/idempotency is owned by `../build/notification-idempotency.sql`.

## Layout

- `docker-compose.yml`: Linux local/VPS reference stack: PostgreSQL 16 + n8n 2.38.7.
- `.env.example`: non-secret configuration template.
- `n8n/case003-due-date-evaluation.json`: portable inactive workflow.
- `scripts/import-workflow.sh`: guarded additive import.
- `scripts/verify-case003-import.js`: fail-closed pre/post state verifier.
- `sql/010-synthetic-smoke.sql`: deterministic local smoke fixture.
- `manifest.json`: pinned versions, artifacts and invariants.

## Local Linux / brand-new VPS

Prerequisites: Docker Engine + Docker Compose plugin.

```bash
cd cases/case-003/runtime
cp .env.example .env
docker compose up -d postgres n8n
```

PostgreSQL initialization mounts the canonical model, idempotency ledger and synthetic smoke fixture from this repository. n8n persists state in a named volume.

Import CASE-003 only after n8n is healthy:

```bash
docker compose exec n8n sh /opt/case003/scripts/import-workflow.sh
```

The script fails closed unless the target workflow is absent before import, credentials are unchanged, the workflow count rises by exactly one, and the imported workflow remains inactive.

## Railway

CASE-003 reuses the existing n8n service and persistent `/home/node/.n8n` volume. Do not create another Railway project/service.

The current production gate is implemented in the CASE-002 runtime branch because that branch owns the live n8n image:

`CASE003_DUE_DATE_IMPORT_ON_STARTUP=true`

On startup it performs:

```text
consistent backup
 -> pre-import verification
 -> import one inactive workflow
 -> post-import verification
 -> consistent backup
```

After the one-shot import succeeds, set the variable back to `false` so future restarts do not attempt re-import.

## Supabase / external PostgreSQL

Apply, in order:

```text
../build/canonical-model.sql
../build/notification-idempotency.sql
```

Then load normalized data/snapshots. The n8n Postgres credential is a runtime secret and is intentionally not committed.

## Smoke query

```sql
select tenant_id, invoice_id, invoice_reference, canonical_due_date,
       due_date_source, due_date_conflict, payment_status_evidence
from case003.invoice_projection
where canonical_due_date between current_date and current_date + interval '3 days';
```

The local synthetic fixture is date-relative so this query remains useful on future dates.

## Current certification boundary

This bundle certifies reproducibility of the canonical schema, inactive n8n workflow import, backup/verification gates, and synthetic read-only due-date evaluation. Outbound WhatsApp delivery and production payment semantics are intentionally outside Gate 1.
