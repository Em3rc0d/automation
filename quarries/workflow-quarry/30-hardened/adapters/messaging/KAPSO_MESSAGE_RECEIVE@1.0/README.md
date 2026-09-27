# KAPSO_MESSAGE_RECEIVE@1.0

Stage: **HARDENED ADAPTER CANDIDATE — NOT APPROVED_BASELINE**

Artifact class: **ADAPTER**

## Purpose

Receive one Kapso `whatsapp.message.received` webhook, verify the provider signature against the raw request body, normalize the provider payload into the repository messaging envelope, and forward the safe envelope to the internal control plane.

This package implements `messaging.receive`. It does not classify workshop intent or create a `ServiceRequest`.

## Provider setup

For the first CASE-002 pilot configure a number-scoped Kapso webhook with:

```text
payload version: v2
event: whatsapp.message.received
buffering: disabled
```

Kapso currently documents these relevant headers:

```text
X-Webhook-Event
X-Webhook-Signature
X-Idempotency-Key
X-Webhook-Payload-Version
```

The signature is HMAC-SHA256 over the raw request body.

## Credential bindings

The repository stores no secrets.

At deployment/test time bind:

1. a Crypto HMAC credential containing the Kapso webhook secret to `Calculate Kapso HMAC`;
2. an internal HTTP Header Auth credential to `Post Normalized Message`.

Also configure:

```text
AUTOMATION_CONTROL_PLANE_URL=https://<internal-control-plane>
```

## Normalized output

The adapter forwards only the fields needed by downstream messaging semantics:

```text
schemaVersion
channel
provider
providerPhoneNumberId
providerEventId
providerMessageId
threadId
senderId
direction
messageType
text
media metadata reference
occurredAt
idempotencyKey
providerMeta
```

Raw provider JSON and raw media are not forwarded into generic execution telemetry.

## Idempotency

Logical key:

```text
kapso:<providerPhoneNumberId>:<providerMessageId>
```

The provider delivery key is also preserved as `providerEventId`. The control plane must enforce the logical `Idempotency-Key` so retries cannot duplicate downstream work.

## Tenant resolution

The webhook itself does not trust a tenant identifier supplied by the Internet. The control plane resolves tenant/ConnectorAccount ownership from `providerPhoneNumberId` before any business workflow runs.

## Deliberate V1 limits

- Kapso webhook payload v2 only;
- `whatsapp.message.received` only;
- buffering/batched payloads rejected;
- outbound send is a separate adapter operation;
- media bytes are fetched by `KAPSO_MEDIA_DOWNLOAD@1.0`.

## References

- `workflows/adapters/messaging/KAPSO-WHATSAPP.md`
- `cases/case-002/WHATSAPP-ADAPTER-DECISION.md`
- `quarries/workflow-quarry/mining-batches/2026-09-11-batch-005-whatsapp-document-accounting.md`
- `quarries/workflow-quarry/mining-batches/2026-09-11-batch-006-control-plane-infrastructure.md`

## Promotion gate

Remain in `30-hardened` until pinned-runtime tests prove signed-delivery verification, malformed-event rejection, duplicate safety, provider retry behavior, tenant-resolution handoff and absence of secret/raw-payload leakage.
