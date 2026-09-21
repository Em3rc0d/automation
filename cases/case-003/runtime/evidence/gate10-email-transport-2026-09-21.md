# CASE-003 Gate 10 email transport evidence — 2026-09-21

## Scope

This checkpoint records the transport decision and the live n8n credential inventory before any real email is sent.

## Live n8n inventory

Read-only credential metadata inspection on the Railway n8n runtime reported:

```text
workflows   = 15
credentials = 5

crypto          Kapso Webhook HMAC
googlePalmApi   CASE002 Gemini API
httpHeaderAuth  CASE002 Control Plane Internal
httpHeaderAuth  CASE003 Supabase RPC Token
httpHeaderAuth  KAPSO API
```

No Gmail OAuth2, SMTP, SendGrid, Resend, or other mail credential exists in the live n8n state.

No credential secret value was read or logged.

## Decision

Gate 10 will use n8n-native mail delivery:

```text
preferred  = Gmail node + OAuth2
fallback   = Send Email node + SMTP
```

A Resend-specific runner is not part of the canonical architecture and has been removed from the repository/runtime source branch.

## Controlled test destination

A controlled test override is supported by `build/gate10-test-email-override.sql`. The override does not modify the active SAP snapshot trusted-contact field.

Only a SHA-256 destination hash and masked destination are persisted. The full test address is intentionally excluded from repository evidence.

The prior unsent test challenge was cancelled after mail transport was found unavailable; it is not counted as delivery evidence.

## Certification status

```text
real WhatsApp verification-init     PASS
durable VERIFICATION_REQUIRED       PASS
challenge creation                  PASS
invoice resume context              PASS
native n8n mail credential          PENDING
real email delivery                 PENDING
code receipt                        PENDING
WhatsApp code verification          PENDING
real identity/membership creation   PENDING
post-auth invoice FOUND             PENDING
```

Gate 10 is prepared, not certified.
