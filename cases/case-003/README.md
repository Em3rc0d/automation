# CASE-003 — SAP snapshot supplier self-service

CASE-003 proves a portable supplier/AP automation path from SAP report exports to a normalized, versioned operational snapshot and n8n orchestration.

## Build artifacts

- `build/canonical-model.sql` — PostgreSQL/Supabase canonical model.
- `build/notification-idempotency.sql` — durable notification reservation ledger.
- `build/gate3-reservation-core.sql` — portable PostgreSQL due-candidate reservation core.
- `build/gate3-reservation-rpc.sql` — Supabase/PostgREST authenticated Gate-3 wrapper.
- `build/gate5-supplier-query-core.sql` — portable supplier identity/membership/permission/ownership query core.
- `build/gate5-supplier-query-rpc.sql` — Supabase/PostgREST Gate-5 authenticated adapter.
- `build/normalize-and-reconcile.js` — QQVA/SCIV/FBL1N normalization and reconciliation logic.
- `build/n8n-due-date-workflow.json` — source n8n workflow.
- `build/synthetic-fixtures.json` — synthetic domain fixture.
- `build/test-g2.js` — deterministic model/reconciliation tests.
- `runtime/` — portable Linux runtime bundle for local machine, new VPS, Railway, and PostgreSQL/Supabase.

## Architecture

```text
QQVA + SCIV + FBL1N
        |
        v
normalize + reconcile
        |
        v
canonical PostgreSQL/Supabase snapshot
        |
        v
n8n orchestration
        |
        v
idempotent notification reservation
        |
        v
channel delivery (later gate)
```

Business truth lives in PostgreSQL/Supabase. n8n remains an execution/orchestration engine.

See `runtime/README.md` for reproducible Linux deployment instructions.
