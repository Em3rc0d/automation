# KAPSO_MESSAGE_SEND@1.0

Stage: **HARDENED ADAPTER CANDIDATE — NOT APPROVED_BASELINE**

Artifact class: **ADAPTER**

## Purpose

Send one WhatsApp text message through Kapso while preserving the repository's provider-neutral `messaging.send` boundary.

CASE-002 uses this adapter for follow-up questions, appointment confirmations and other customer-facing text actions. Business workflows must not build Kapso-specific request bodies themselves.

## Required input

```text
tenantId
providerPhoneNumberId
to
text
traceId
businessActionId
idempotencyKey
```

`businessActionId` must already exist in the platform/calling orchestration before the provider side effect is attempted.

## Provider request

The adapter calls:

```text
POST https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages
X-API-Key: <credential binding>
```

V1 supports text messages only. It sets `biz_opaque_callback_data` to the `businessActionId` so later provider webhooks can be correlated back to the same platform action.

## Critical retry rule

The provider send call intentionally has **no automatic retry**.

A transport timeout can occur after the provider has already accepted the message. Retrying the POST blindly could send the customer the same message twice. Until provider-side request idempotency is explicitly proven, the safe state is:

```text
provider timeout / ambiguous result
-> mark business action outcome UNKNOWN
-> reconcile using provider status/webhook when available
-> otherwise route to operator review
-> do not blindly replay
```

The logical `idempotencyKey` therefore protects the platform BusinessAction boundary; it is not a claim that the Kapso POST itself is replay-safe.

## Normalized result

A successful provider response becomes:

```json
{
  "schemaVersion": "1.0",
  "provider": "kapso",
  "channel": "whatsapp",
  "providerMessageId": "wamid...",
  "businessActionId": "ba_...",
  "status": "accepted_by_provider",
  "retrySafe": false
}
```

The caller must persist `providerMessageId` immediately.

## Credential binding

No API key is stored in the repository. Bind an n8n HTTP Header Auth credential containing `X-API-Key` to `Send Kapso Message` at test/deployment time.

Optional environment override:

```text
KAPSO_META_API_BASE_URL=https://api.kapso.ai/meta/whatsapp/v24.0
```

## V1 limits

- text messages only;
- no template-policy automation;
- no media upload/send;
- no automatic provider retries;
- delivery/read-state ingestion remains a separate adapter concern.

## Promotion gate

Remain in `30-hardened` until pinned-runtime import succeeds and a controlled Kapso test proves provider message ID capture, correlation, validation failures with zero sends, and ambiguous-outcome handling without blind retry.
