# CASE-003 Gate 9 — verified supplier identity

Gate 9 closes the identity gap exposed by the real Gate-8 WhatsApp proof.

Gate 8 correctly returned `AUTH_REQUIRED` for an unknown real WhatsApp sender. Gate 9 adds a durable verification state machine so a channel identity can become verified only after proof through a trusted pre-existing supplier contact or an explicit audited operator approval.

## Trust rule

```text
RUC / tax ID
  -> identifies candidate supplier only
  -> NEVER authenticates

candidate supplier
  -> trusted contact from ACTIVE published snapshot
  -> verification challenge
  -> proof
  -> verified external identity
  -> active membership
  -> invoice.read
  -> resource ownership
  -> invoice result
```

The raw trusted email is never returned to the WhatsApp/user-facing response. Only a masked address may be shown there.

## Verification methods

### Email code

The portable core creates a 12-character cryptographically random hexadecimal code. Only SHA-256 of the code is persisted. The raw code and full trusted destination are returned only to the internal delivery adapter.

Properties:

- 10-minute challenge TTL, bounded by the original 15-minute verification request.
- Maximum 5 code attempts.
- Maximum 3 challenges/hour per channel subject.
- Maximum 10 challenges/day per supplier/vendor.
- Only one pending challenge per verification request.
- The database never stores the raw verification code.
- The delivery ledger stores only a SHA-256 destination hash and masked destination.
- A correct code is single-use because the challenge moves from `pending` to `verified`.

### Operator approval

An operator may explicitly approve a pending request through the internal authenticated RPC. The approval requires:

- operator reference,
- approval reason,
- audit event.

This path is intended for controlled support/onboarding cases, not silent auto-binding.

## Durable objects

Portable PostgreSQL:

- `../build/gate9-verification-core.sql`
- `../build/gate9-provider-verification-core.sql`

Supabase/PostgREST adapters:

- `../build/gate9-verification-rpc.sql`
- `../build/gate9-provider-verification-rpc.sql`

Tables:

- `case003.verification_challenge`
- `case003.verification_delivery`
- `case003.verification_event`

The existing `case003.verification_request` now carries `requested_invoice_reference` when available.

## Core functions

```text
case003.prepare_email_verification(request_id, trace_id)
case003.mark_verification_delivery(...)
case003.verify_email_code(...)
case003.operator_approve_verification(...)
case003.verify_provider_email_code(...)
```

On successful proof, `complete_verification_request(...)` creates or reactivates:

```text
external_user
 -> external_identity verified_at != null
 -> external_membership
 -> invoice.read
```

No supplier access is created before successful proof.

## Provider flow

The provider verification bridge resolves tenant scope exactly as Gate 7 does:

```text
provider + provider_channel_key
 -> channel_connector_binding
 -> tenant + channel
 -> subject hash
 -> verification challenge
```

A provider payload cannot choose its own tenant.

## Email delivery boundary

The email delivery adapter is intentionally separate from the identity core.

The internal preparation function may return:

```json
{
  "decision": "VERIFICATION_DELIVERY_REQUIRED",
  "delivery": {
    "method": "email",
    "destination_email": "<trusted contact>",
    "verification_code": "<one-time code>"
  }
}
```

That `delivery` object is **server-side only**. A channel response must strip it before responding to WhatsApp/Kapso.

Production email transport still needs an explicit connector credential (SMTP, transactional email provider, or equivalent). Gate 9 does not embed email credentials or hard-code a provider.

## Reproducible smoke

After the synthetic base fixture:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f /opt/case003/sql/010-synthetic-smoke.sql \
  -f /opt/case003/sql/030-gate9-verification-smoke.sql
```

The smoke test proves:

```text
pending verification
 -> challenge generated
 -> wrong code rejected
 -> correct code VERIFIED
 -> verified identity/membership/permission created
 -> owned synthetic invoice FOUND
 -> synthetic access cleaned up
```

No real email is sent by the smoke test.

## Certified database proof

On 2026-09-21 the production-like Supabase control plane was tested with a synthetic channel subject against the real published supplier snapshot.

Observed:

```text
prepare challenge -> VERIFICATION_DELIVERY_REQUIRED
wrong code        -> INVALID_VERIFICATION_CODE, attempts_remaining=4
correct code      -> VERIFIED
retry invoice     -> FOUND / 01-FM01-0096939
cleanup           -> request=0, user=0, membership=0
```

The test did not send the code to the real supplier contact and removed the synthetic access identity immediately after proof.

## Current boundary

Gate 9 certifies the verification state machine, trusted-contact challenge generation, rate limits, code validation, operator approval contract, verified identity creation, membership/permission grant, and post-verification ownership query.

It does not yet certify a real transactional email delivered to the supplier's trusted mailbox. That requires the email transport connector to be configured explicitly. It also keeps CASE-003 WhatsApp outbound delivery disabled.
