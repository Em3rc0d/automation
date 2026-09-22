# Database deployment

CASE-003 has two distinct database responsibilities.

## 1. n8n internal database

Stores n8n workflows, credentials metadata/payloads, users, executions and runtime metadata.

Recommended for new production environments:

```text
PostgreSQL 16-class service
dedicated database/user
not shared with CASE-003 business tables
```

The current Railway compatibility deployment uses SQLite on a persistent volume. That is valid for the single-instance certified runtime but is not the preferred greenfield scaling target.

## 2. CASE-003 business/control database

Stores the canonical SAP snapshot and the security/business state:

```text
supplier
invoice
financial item
snapshot/import provenance
channel/provider bindings
verification_request
verification_challenge
verification_delivery
external identity
membership
permission
audit/event state
```

### Certified profile

Hosted Supabase/PostgreSQL + PostgREST RPC adapters.

### Plain PostgreSQL profile

The core functions are designed to be PostgreSQL-portable, but the public `case003_*_json` wrappers rely on Supabase/PostgREST request headers/roles. A move to plain PostgreSQL requires a direct-Postgres n8n adapter or a compatible PostgREST layer and separate certification.

Do not claim a plain-Postgres Gate-9/10 deployment is certified merely because the SQL core loads.

## Schema order

Use `../runtime/manifest.json` as the machine-readable source of truth. The current logical order is:

```text
canonical-model.sql
notification-idempotency.sql
gate2-supabase-rpc.sql
gate3-reservation-core.sql
gate3-reservation-rpc.sql
gate4-import-provenance.sql
gate4-batch-ingest-rpc.sql
gate4-staged-import.sql
gate5-supplier-query-core.sql
gate5-supplier-query-rpc.sql
gate6-channel-ingress-core.sql
gate6-channel-ingress-rpc.sql
gate7-provider-ingress-core.sql
gate7-provider-ingress-rpc.sql
gate9-verification-core.sql
gate9-verification-rpc.sql
gate9-provider-verification-core.sql
gate9-provider-verification-rpc.sql
gate10-test-email-override.sql
```

Additional hotfixes/evidence-specific migrations must remain represented in the runtime manifest/evidence before a rebuild is declared equivalent.

## Supabase migration workflow

Recommended production discipline:

```text
local/test
-> migration file
-> review
-> backup
-> supabase db push / controlled apply
-> smoke
-> security advisor
-> evidence
```

Supabase documents `supabase migration new`, `supabase link` and `supabase db push` as its migration workflow.

## RLS

Supabase's production guidance recommends Row Level Security for tables exposed through its API.

CASE-003 currently has a known hardening boundary around RLS. Do not silently enable RLS table-by-table in production because existing RPC/security-definer behavior must be validated against the new policies.

RLS hardening must be a dedicated gate with:

- inventory of every exposed table/function;
- explicit policy per role/use case;
- positive and negative tenancy tests;
- provider webhook regression tests;
- restore point before rollout.

## API keys

For new Supabase deployments, prefer publishable/secret key types as supported by the current integration contract. Do not place secret/service credentials in a browser/client workflow.

## Backups

Supabase managed backups and logical `supabase db dump` are complementary. Database backups do not include deleted Storage objects; if CASE-003 later uses Supabase Storage, back up that content separately.

References:

- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/deployment/going-into-prod
