# Kapso WhatsApp Adapter

Artifact class: **ADAPTER**  
Status: **PILOT PRIMARY / HARDENED RECEIVE+MEDIA+SEND CANDIDATES**  
Provider: **Kapso**

## Purpose

Implement the provider side of the repository messaging capabilities without leaking Kapso-specific payloads into business workflows.

Supported target capabilities:

- `messaging.receive`
- `messaging.send`
- `messaging.thread.read`
- `messaging.media.download`

CASE-002 binds this adapter first. Business contracts such as `ServiceRequest`, `Evidence`, appointments and work orders must remain unchanged if the adapter is swapped.

## Current provider surfaces

The provider documentation currently exposes:

- Platform API v1 webhooks under `https://api.kapso.ai/platform/v1`;
- WhatsApp proxy endpoints under `https://api.kapso.ai/meta/whatsapp/v24.0`;
- project API-key authentication through `X-API-Key`;
- webhook payload version `v2` for new integrations;
- `whatsapp.message.received` for inbound messages;
- HMAC-SHA256 webhook signatures over the raw request body;
- `X-Idempotency-Key` for webhook delivery deduplication;
- message/media IDs compatible with the WhatsApp/Meta-shaped payload plus Kapso extensions;
- `POST /{phone_number_id}/messages` for outbound messages;
- `biz_opaque_callback_data` for caller-supplied correlation data;
- temporary authenticated media-download URLs and provider SHA-256 metadata.

Provider references used during hardening:

- https://docs.kapso.ai/docs/platform/webhooks/overview
- https://docs.kapso.ai/docs/platform/webhooks/security
- https://docs.kapso.ai/docs/platform/webhooks/advanced
- https://docs.kapso.ai/api/meta/whatsapp/messages/send-a-message
- https://docs.kapso.ai/api/meta/whatsapp/media/get-media-url
- https://docs.kapso.ai/docs/whatsapp/send-messages/text

## Inbound contract

For the pilot, register a number-scoped webhook with:

```text
kind = kapso
events = [whatsapp.message.received]
payload_version = v2
buffer_enabled = false
```

Buffering stays off in the first certified adapter so one provider delivery corresponds to one ingress event. A later adapter version may support batches explicitly.

Required headers:

```text
X-Webhook-Event
X-Webhook-Signature
X-Idempotency-Key
X-Webhook-Payload-Version
```

The adapter MUST:

1. read the raw request body;
2. verify `X-Webhook-Signature` with HMAC-SHA256 and the tenant/connector-scoped webhook secret;
3. reject unsupported payload versions/events;
4. normalize only required message fields;
5. preserve provider phone-number, conversation, message and media IDs;
6. derive a stable idempotency key;
7. forward the normalized event to the control plane;
8. never place the raw payload or media binary in generic execution telemetry.

## Canonical normalized event

```json
{
  "schemaVersion": "1.0",
  "channel": "whatsapp",
  "provider": "kapso",
  "providerPhoneNumberId": "1234567890",
  "providerEventId": "provider-idempotency-key",
  "providerMessageId": "wamid...",
  "threadId": "conversation-id",
  "senderId": "15551234567",
  "direction": "inbound",
  "messageType": "text",
  "text": "Necesito una cita",
  "media": null,
  "occurredAt": "2026-09-14T17:00:00.000Z",
  "idempotencyKey": "kapso:1234567890:wamid..."
}
```

Tenant resolution is performed from the persisted connector/phone-number mapping before business processing.

## Media download

Given a provider media ID, the adapter retrieves media metadata through:

```text
GET https://api.kapso.ai/meta/whatsapp/v24.0/{media_id}?phone_number_id={phone_number_id}
```

The metadata response may include:

- `mime_type`;
- `sha256`;
- `file_size`;
- temporary `download_url`;
- download URL expiry.

The adapter then downloads the bytes, enforces size/type policy, recomputes SHA-256, and returns binary to the evidence-storage composition. The binary is not serialized into logs.

## Outbound text send

V1 sends through:

```text
POST https://api.kapso.ai/meta/whatsapp/v24.0/{phone_number_id}/messages
```

The adapter receives a provider-neutral outbound action and returns the provider `wamid` as `providerMessageId`.

Before invocation, the caller MUST allocate a durable `BusinessAction`/`idempotencyKey`. The adapter sets:

```text
biz_opaque_callback_data = businessActionId
```

so downstream provider status/webhook events can be reconciled back to the same business action.

### Retry boundary

The first hardened send adapter intentionally does **not** automatically retry the provider POST.

A network timeout can be ambiguous: the provider may already have accepted the message. Blind retry could send duplicate appointment confirmations or follow-up questions. Therefore an ambiguous outcome becomes a reconciliation/operator-review condition before replay.

This is different from safe retries when posting normalized telemetry/control-plane events with a known idempotency boundary.

## Credential model

No API key or webhook secret belongs in workflow JSON.

Required deployment bindings:

- Kapso API-key secret reference;
- Kapso webhook-HMAC secret reference;
- internal control-plane authentication reference.

## Health and operations

Before pilot activation verify:

- webhook exists and is active;
- signed test delivery succeeds;
- message IDs and conversation IDs are persisted;
- duplicate webhook delivery is harmless;
- media retrieval/hash succeeds;
- outbound send returns/persists provider message ID;
- ambiguous outbound failure does not trigger a blind duplicate send;
- 401/404/provider 5xx behavior is classified correctly;
- credential rotation procedure is documented.

## CASE-002 packages

Current hardened adapter candidates:

- `KAPSO_MESSAGE_RECEIVE@1.0` -> `messaging.receive`
- `KAPSO_MEDIA_DOWNLOAD@1.0` -> `messaging.media.download`
- `KAPSO_MESSAGE_SEND@1.0` -> `messaging.send`

These are provider adapters, not new business capabilities. Each still needs its own runtime/provider test evidence before `TESTED` or `APPROVED_BASELINE`.
