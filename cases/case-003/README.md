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
- `build/gate9-verification-core.sql` / `build/gate9-verification-rpc.sql` — trusted-contact verification state machine and RPC adapter.
- `build/gate9-provider-verification-core.sql` / `build/gate9-provider-verification-rpc.sql` — provider-bound verification-code consumption.
- `build/gate9-request-resume-hotfix.sql` — preserves the invoice reference that triggered verification.
- `build/gate10-test-email-override.sql` — controlled test-only email destination override; stores only hash + masked destination.
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
trusted-contact verification
        |
        v
email delivery adapter (Gate 10; Gmail OAuth2 preferred)
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


### Gate 10 email delivery

Gate 10 is the transport boundary for the email verification code. The identity core remains provider-neutral: PostgreSQL creates and hashes the challenge; n8n delivers it through a mail connector and records delivery outcome.

For the controlled real test, the repository keeps the SAP trusted-contact data unchanged and uses a short-lived test override whose database representation is only SHA-256 + masked destination. The preferred runtime transport is the native n8n Gmail node with OAuth2; SMTP via n8n `Send Email` is the supported fallback. No Resend-specific runtime is part of the canonical design.

See `runtime/gate10-email-delivery.md`.
