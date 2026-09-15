# CASE-002 WhatsApp Adapter Decision

Status: **PILOT ADAPTER DECISION / IMPLEMENTATION IN PROGRESS**

CASE-002 keeps WhatsApp business semantics provider-neutral, but the productive pilot should prefer adapters that are easier to configure than binding the assembly directly to Meta WhatsApp Cloud API.

## Preferred adapters

1. **Kapso**
2. **OpenWA**

Direct **Meta WhatsApp Cloud API** is retained only as a fallback/reference adapter unless a client installation specifically requires it.

## Architectural rule

The case and reusable business workflows depend on connector capabilities such as:

```text
messaging.receive
messaging.send
messaging.thread.read
messaging.media.download
```

They do not depend on a provider-specific business capability.

Provider bindings therefore look like:

```text
messaging.receive
  -> KAPSO_MESSAGE_RECEIVE@1.0
  -> OpenWA receive adapter
  -> Meta Cloud adapter (fallback/reference)

messaging.media.download
  -> KAPSO_MEDIA_DOWNLOAD@1.0
  -> OpenWA media adapter
  -> Meta Cloud adapter (fallback/reference)

messaging.send
  -> Kapso send adapter
  -> OpenWA send adapter
  -> Meta Cloud adapter (fallback/reference)
```

Provider choice belongs to adapter/configuration binding, not to the semantic capability catalog.

## Agent ownership boundary

Kapso/OpenWA/Meta are transport and connector providers. They are **not** the business agent for CASE-002.

All customer-facing interpretation, follow-up questions, triage, policy application, tool use and response generation must originate from the platform-owned CASE-002 agent/runtime and then leave through `messaging.send` using the configured provider adapter.

Provider-hosted autonomous agents, auto-replies or AI workflow responders must be disabled for the bound CASE-002 number/session during pilot and production operation unless they are explicitly acting as a thin transport primitive under platform control. A provider-side agent must never independently decide customer-facing business behavior.

Required conversation path:

```text
WhatsApp customer
  -> provider transport (Kapso/OpenWA/Meta)
  -> messaging.receive adapter
  -> platform control plane / CASE-002 agent
  -> policy + tools + human gates
  -> messaging.send
  -> provider transport
  -> WhatsApp customer
```

Consequences:

- provider-generated replies are not valid CASE-002 acceptance evidence;
- provider agents must not race or duplicate platform responses;
- conversation state, audit, idempotency and business policy remain platform-owned;
- switching Kapso/OpenWA/Meta must not change the agent's business semantics;
- outbound tests must prove the response came through the platform agent and `messaging.send`, not a provider-hosted agent.

## Current implementation state

| Capability | Kapso | OpenWA | Direct Meta |
|---|---|---|---|
| `messaging.receive` | `HARDENED` candidate — `KAPSO_MESSAGE_RECEIVE@1.0` | `DESIGNED_MINED` | fallback/reference |
| `messaging.media.download` | `HARDENED` candidate — `KAPSO_MEDIA_DOWNLOAD@1.0` | `DESIGNED_MINED` | fallback/reference |
| `messaging.send` | `HARDENED` candidate — `KAPSO_MESSAGE_SEND@1.0` | `DESIGNED_MINED` | fallback/reference |
| `messaging.thread.read` | provider mapping documented; not yet hardened | `DESIGNED_MINED` | fallback/reference |

`HARDENED` does not mean `APPROVED_BASELINE`. The Kapso packages still require pinned-runtime execution tests and promotion evidence.

Provider specifications:

- `workflows/adapters/messaging/KAPSO-WHATSAPP.md`
- `workflows/adapters/messaging/OPENWA-WHATSAPP.md`

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
- adapter-specific cost telemetry when applicable;
- provider-hosted autonomous responders disabled or proven non-authoritative for the bound number/session.

## Portability acceptance condition

CASE-002 must not require changes to `ServiceRequest`, `Evidence`, appointment, work-order, agent policy or telemetry contracts when switching between Kapso and OpenWA. Only the connector binding and provider-normalization layer may change.

The acceptance suite must eventually replay equivalent inbound text/media fixtures through both adapters and compare the resulting canonical messaging envelope before business processing begins.
