# CASE-003 — SAP snapshot supplier self-service

CASE-003 proves a portable supplier/AP automation path from SAP report exports to a normalized, versioned operational snapshot and n8n orchestration.

## Build artifacts

- `build/canonical-model.sql` — PostgreSQL/Supabase canonical model.
- `build/notification-idempotency.sql` — durable notification reservation ledger.
- `build/gate3-reservation-core.sql` — portable PostgreSQL due-candidate reservation core.
- `build/gate3-reservation-rpc.sql` — Supabase/PostgREST authenticated Gate-3 wrapper.
- `build/gate5-supplier-query-core.sql` — portable supplier identity/membership/permission/ownership query core.
- `build/gate5-supplier-query-rpc.sql` — Supabase/PostgREST Gate-5 authenticated adapter.
- `build/gate6-channel-ingress-core.sql` — portable authenticated channel-ingress/replay/verification-init core.
- `build/gate6-channel-ingress-rpc.sql` — Supabase/PostgREST Gate-6 adapter.
- `build/gate7-provider-ingress-core.sql` — portable provider/channel binding and Kapso ingress core.
- `build/gate7-provider-ingress-rpc.sql` — Supabase/PostgREST Gate-7 adapter.
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


### Gate 9 verification

Gate 9 turns the Gate-8 `AUTH_REQUIRED` boundary into an auditable identity-verification state machine. The source RUC identifies a candidate supplier only; trusted-contact proof or operator approval is required before creating a verified channel identity and `invoice.read` membership.

See:

- `build/gate9-verification-core.sql`
- `build/gate9-verification-rpc.sql`
- `build/gate9-provider-verification-core.sql`
- `build/gate9-provider-verification-rpc.sql`
- `runtime/gate9-verification.md`
