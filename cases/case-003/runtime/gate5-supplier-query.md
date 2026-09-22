# CASE-003 Gate 5 — supplier identity and invoice query

Gate 5 proves the read path a supplier-facing channel will use before any WhatsApp delivery is enabled.

## Trust chain

```text
channel subject
  -> external_identity (active + verified)
  -> external_user (active)
  -> external_membership (active)
  -> external_membership_permission = invoice.read
  -> resource ownership (tenant + SAP vendor + optional company code)
  -> ACTIVE canonical invoice snapshot
  -> safe response decision
  -> audit
```

RUC/tax ID is not used as an authentication secret. Gate 5 test identities are opaque synthetic channel subjects; no real phone number or email is stored.

## Response decisions

`FOUND` returns canonical invoice fields for an owned resource. `AUTH_REQUIRED` is returned when the channel identity is missing or unverified. `NOT_FOUND_OR_NOT_AUTHORIZED` is deliberately neutral for missing membership, missing permission, wrong supplier ownership, or missing resource. `NEEDS_DISAMBIGUATION` is reserved for multiple owned matches.

The neutral decision prevents an authenticated user from learning whether an invoice exists outside their authorized resource scope.

## Certified Gate-5 fixture

The test fixture creates three synthetic verified identities:

- authorized membership for SAP vendor `100800070`, company `PE10`, with `invoice.read`;
- wrong synthetic vendor membership with `invoice.read`;
- correct vendor membership without `invoice.read`.

A fourth unknown subject is intentionally absent.

The real Gate-4 invoice used for the positive case is:

```text
invoice_reference = 01-FM01-0096939
company_code      = PE10
FI document       = 5100028290
snapshot_id       = b1ea19f1-ed7d-54b5-9009-10759dd6126d
```

## Expected proof

```text
authorized identity + membership + invoice.read + owned invoice
  -> FOUND

verified identity + invoice.read + wrong vendor scope
  -> NOT_FOUND_OR_NOT_AUTHORIZED
  -> no invoice fields

verified identity + correct vendor + no invoice.read
  -> NOT_FOUND_OR_NOT_AUTHORIZED
  -> no invoice fields

unknown identity
  -> AUTH_REQUIRED
  -> no invoice fields
```

Every attempt writes `supplier_query_audit` with the internal decision reason. Outward responses do not expose that reason.

## Runtime targets

Portable PostgreSQL core:

`../build/gate5-supplier-query-core.sql`

Supabase/PostgREST adapter:

`../build/gate5-supplier-query-rpc.sql`

Synthetic test fixture:

`gate5-synthetic-access-fixtures.sql`

n8n portable template:

`n8n/case003-supplier-query-gate5.template.json`

The n8n workflow remains inactive and contains no outbound messaging node. It generates four test cases, calls the authenticated canonical query, asserts all access-control decisions, and renders channel-neutral response objects with `channel_delivery=disabled`.

## Linux / VPS

For a Supabase-backed Linux deployment, render and import the Gate-5 workflow with:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate5.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate5.sh
docker compose up -d n8n
```

Required environment values are the Supabase URL/publishable key plus Gate-5 tenant, invoice, company, FI document and snapshot identifiers. The dedicated `case003RpcAuthV1` credential carries the additional integration token and must be created securely outside Git.

For vanilla PostgreSQL, the bundled n8n adapter uses `case003.supplier_invoice_query_direct(...)` with the existing `case003PostgresV1` credential:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate5-postgres.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate5.sh
docker compose up -d n8n
```

Direct-PostgreSQL artifact:

`n8n/case003-supplier-query-gate5-postgres.template.json`

The local Compose database initializes `gate5-supplier-query-core.sql` and `sql/020-gate5-access-smoke.sql` automatically. The SQL core has no Supabase role dependency.

## Boundary

Gate 5 certifies identity resolution, verified-state enforcement, membership, permission, ownership, neutral denial, canonical invoice lookup, safe response rendering and audit. It still does not send WhatsApp messages and does not reinterpret `PAYMENT_DATE_EVIDENCE` as certified paid/unpaid state.
