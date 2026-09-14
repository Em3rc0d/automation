# Kapso WhatsApp Adapter

Artifact class: **ADAPTER**  
Status: **PILOT PRIMARY / IMPLEMENTATION TARGET**  
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

The current provider documentation exposes:

- Platform API v1 webhooks under `https://api.kapso.ai/platform/v1`;
- WhatsApp proxy endpoints under `https://api.kapso.ai/meta/whatsapp/v24.0`;
- project API-key authentication through `X-API-Key`;
- webhook payload version `v2` for new integrations;
- `whatsapp.message.received` for inbound messages;
- HMAC-SHA256 webhook signatures over the raw request body;
- `X-Idempotency-Key` for delivery deduplication;
- message/media IDs compatible with the WhatsApp/Meta-shaped payload plus `kapso` extensions.

Provider references used during hardening:

- https://docs.kapso.ai/docs/platform/webhooks/overview
- https://docs.kapso.ai/docs/platform/webhooks/security
- https://docs.kapso.ai/docs/platform/webhooks/advanced
- https://docs.kapso.ai/api/meta/whatsapp/messages/send-a-message
- https://docs.kapso.ai/api/meta/whatsapp/media/get-media-url
- https://docs.kapso.ai/docs/whatsapp/typescript-sdk/media

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
8. never place the raw payload or media binary in execution telemetry.

## Canonical normalized event

```json
{
  "schemaVersion": "1.0",
  "channel": "whatsapp",
  "provider": "kapso",
  "providerPhoneNumberId": "1234567890",
  "providerEventId": "uuid-from-idempotency-header",
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

## Credential model

No API key or webhook secret belongs in workflow JSON.

Required deployment bindings:

- Kapso API-key secret reference;
- Kapso webhook-HMAC secret reference;
- internal control-plane authentication reference.

## Health and operations

Before pilot activation verify:

- webhook exists and is active;
- test delivery succeeds;
- message IDs and conversation IDs are persisted;
- media retrieval succeeds;
- duplicate webhook delivery is harmless;
- 401/404/provider 5xx behavior is classified correctly;
- credential rotation procedure is documented.

## CASE-002 packages

Initial hardened adapter packages:

- `KAPSO_MESSAGE_RECEIVE@1.0`
- `KAPSO_MEDIA_DOWNLOAD@1.0`

These are provider adapters, not new business capabilities.