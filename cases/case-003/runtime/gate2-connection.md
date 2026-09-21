# CASE-003 Gate 2 — n8n to PostgreSQL/Supabase

Goal: prove that the imported inactive n8n workflow can query the CASE-003 canonical model without modifying existing n8n credentials and without outbound delivery.

## Safety sequence

1. Confirm n8n is healthy and Gate 1 remains persisted.
2. Inspect credential metadata only: `id`, `name`, `type`. Never read credential payloads.
3. If an existing credential has type `postgres`, reuse its ID only if it is already intended for the CASE-003 database.
4. Otherwise create a dedicated CASE-003 PostgreSQL credential. Do not repurpose or edit an existing credential.
5. Bind only the CASE-003 workflow.
6. Keep the workflow inactive and run it manually/read-only.
7. Verify deterministic rows from `case003.invoice_projection`.
8. Re-run the idempotency path and prove duplicate reservation is rejected before any channel send.

## Linux metadata inspection

When n8n is stopped, or from the same n8n image against its persistent volume:

```bash
node /opt/case003/scripts/inspect-credential-metadata.js
```

Expected output contains metadata only, for example:

```text
[case003-credentials] count=N
[case003-credentials] id=... type=postgres name="..."
```

No `data` column is selected.

## Connection material

Database host, port, database, username, password and TLS requirements are runtime secrets/configuration. They are never committed to Git. Use the platform secret store or n8n credential store.

For Supabase-hosted PostgreSQL, use the database connection values supplied by that Supabase project. The canonical schema remains `case003`.

## Gate-2 pass conditions

```text
existing workflows unchanged except CASE-003 credential binding
existing credentials unchanged OR +1 dedicated CASE-003 postgres credential
CASE-003 remains inactive
read-only query succeeds
rows come from ACTIVE snapshot only
no WhatsApp/channel side effect
```
