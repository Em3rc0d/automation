# CASE-002 WhatsApp Adapter Decision

Status: **PILOT ADAPTER DECISION**

CASE-002 keeps WhatsApp business semantics provider-neutral, but the productive pilot should prefer adapters that are easier to configure than binding the assembly directly to Meta WhatsApp Cloud API.

## Preferred adapters

1. **Kapso**
2. **OpenWA**

Direct **Meta WhatsApp Cloud API** is retained only as a fallback/reference adapter unless a client installation specifically requires it.

## Architectural rule

The case and reusable baselines depend on capabilities such as:

```text
messaging.receive
messaging.send
messaging.thread.read
messaging.media.download
```

They do not depend on a provider-specific business capability.

Therefore:

```text
WHATSAPP_INBOUND
  -> Kapso adapter
  -> OpenWA adapter
  -> Meta Cloud adapter (fallback/reference)

WHATSAPP_MEDIA_FETCH
  -> Kapso adapter
  -> OpenWA adapter
  -> Meta Cloud adapter (fallback/reference)
```

Provider choice belongs to adapter/configuration binding, not to the semantic capability catalog.

## Adapter certification checklist

Before an adapter is accepted for a productive pilot it must document and test:

- authentication/credential handling;
- inbound webhook/event contract;
- webhook authenticity/replay controls supported by that provider;
- stable external message/thread/media IDs;
- outbound send contract and delivery state;
- media download behavior;
- retryable vs non-retryable errors;
- rate/usage limits when applicable;
- idempotency/replay behavior;
- connector healthcheck/reconnect behavior;
- credential expiry/rotation behavior;
- PII/media handling and retention implications;
- adapter-specific cost telemetry when applicable.

## Portability acceptance condition

CASE-002 must not require changes to `ServiceRequest`, `Evidence`, appointment, work-order or telemetry contracts when switching between Kapso and OpenWA. Only the connector binding and provider-normalization layer may change.
