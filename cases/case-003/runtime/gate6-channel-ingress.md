# CASE-003 Gate 6 — authenticated channel ingress and verification initiation

Gate 6 moves CASE-003 from an internal/manual query harness to an authenticated provider-neutral HTTP ingress while keeping outbound messaging disabled.

## Trust boundary

```text
provider/channel event
  -> authenticated webhook
  -> normalized provider-neutral envelope
  -> replay protection
  -> channel identity lookup
  -> if verified: Gate-5 membership/permission/ownership query
  -> if unknown: verification initiation only
  -> safe response
  -> audit/state
```

RUC/tax ID remains identification, never authentication. An unknown channel subject that supplies a valid RUC is **not** converted into a verified identity or membership.

## Provider-neutral envelope

Gate-6 n8n accepts a POST envelope with these logical fields:

```json
{
  "tenant_id": "<tenant uuid>",
  "channel": "whatsapp",
  "subject": "<provider sender/channel subject>",
  "provider_message_id": "<provider event/message id>",
  "trace_id": "<trace id>",
  "text": "FACTURA <reference>",
  "invoice_reference": "<optional explicit reference>",
  "claimed_tax_id": "<optional identification claim>"
}
```

The live workflow additionally parses `FACTURA/INVOICE` and `RUC/TAX` tokens from text for the Gate-6 harness. A future provider adapter should populate the same normalized fields directly.

## Replay protection

`case003.channel_message` has a unique key:

```text
tenant_id + channel + provider_message_id
```

A replay returns `DUPLICATE / duplicate_ignored` and does not repeat the business action.

## Verified identity path

For a verified `external_identity`, Gate 6 delegates to the Gate-5 resolver:

```text
verified identity
 -> active membership
 -> invoice.read
 -> resource ownership
 -> ACTIVE canonical snapshot
 -> FOUND or neutral denial
```

Only `FOUND` contains invoice fields.

## Unknown identity path

Without a verified identity:

```text
no tax-id claim
 -> AUTH_REQUIRED
 -> next_action=provide_tax_id

tax-id claim
 -> identify candidate vendor/contact only
 -> VERIFICATION_REQUIRED
 -> pending verification_request
 -> trusted contact shown masked
 -> delivery_status=disabled
 -> NO membership creation
 -> NO identity auto-binding
```

A single RUC may have multiple company-code rows. Gate 6 treats those as one candidate relationship only when the ACTIVE snapshot resolves to exactly one SAP vendor and one pre-existing trusted contact. If the supplier relationship is ambiguous, the outward response is neutral.

Verification requests expire after 15 minutes. Gate 6 does not yet send OTP/email or approve a request.

## Database artifacts

Portable PostgreSQL core:

- `../build/gate6-channel-ingress-core.sql`
- `case003.process_channel_message(...)`
- `case003.channel_message_direct(...)`

Supabase/PostgREST adapter:

- `../build/gate6-channel-ingress-rpc.sql`
- `public.case003_channel_message_json(...)`

Combined Supabase convenience migration:

- `../build/gate6-channel-ingress.sql`

Synthetic channel fixture:

- `gate6-synthetic-channel-fixture.sql`

## n8n artifacts

Supabase template:

- `n8n/case003-supplier-channel-gate6.template.json`

Direct PostgreSQL template:

- `n8n/case003-supplier-channel-gate6-postgres.template.json`

Workflow identity:

```text
id   = case003SupplierChannelGate6V1
name = CASE-003 Supplier Channel Gate 6
path = POST /webhook/case003/supplier-channel
```

The workflow contains no provider send node. Its terminal node only returns an HTTP response.

## Local Linux / VPS

For Supabase-backed n8n:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate6.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate6-http.sh
docker compose up -d n8n
```

The HTTP proof temporarily activates only the Gate-6 webhook, starts n8n locally, performs authenticated requests, then restores the workflow to inactive.

For vanilla PostgreSQL, use the Gate-6 core and the direct-PostgreSQL workflow template with a least-privilege `case003PostgresV1` credential.

## Certified decision matrix

```text
verified synthetic WhatsApp subject + owned real invoice
 -> FOUND

same provider_message_id replayed
 -> DUPLICATE

unknown subject without RUC
 -> AUTH_REQUIRED / provide_tax_id

unknown subject + real source RUC
 -> VERIFICATION_REQUIRED
 -> trusted contact masked
 -> delivery disabled

same unknown subject after RUC claim
 -> still AUTH_REQUIRED
 -> proves no RUC auto-bind
```

The RUC verification-init behavior is certified in the database core even when a deployment environment intentionally does not inject real source RUC data into runtime environment variables.

## Current boundary

Gate 6 certifies authenticated provider-neutral HTTP ingress, replay protection, verified identity routing, and safe verification initiation.

It does **not** yet certify a real Kapso/Meta webhook hitting this CASE-003 route, OTP/email delivery, approval of a verification request, or WhatsApp outbound response. Those remain later gates.
