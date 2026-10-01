# WhatsApp Ingress Architecture — MK1

Status: **DESIGN AUTHORITY / NOT YET LIVE-CERTIFIED**
Updated: 2026-10-01
Depends on: `ADR-0010-WHATSAPP-FIRST-COMMERCIAL-ENTRYPOINT.md`

## Purpose

Define the minimum architecture required to make WhatsApp a safe commercial ingress for LeadFlow without turning the platform into a chatbot product or provisioning one server per tenant.

## Boundary

WhatsApp is a **channel adapter**.

It is not:
- the source of truth for the business process;
- the workflow engine;
- the CRM;
- the customer portal;
- an excuse to bypass tenant isolation, idempotency or approval policy.

## Inbound path

```text
Meta webhook
  ↓
HTTPS ingress
  ↓
provider verification
  ↓
event identity / dedupe
  ↓
normalize provider payload
  ↓
resolve WABA / phone number → ConnectorAccount → tenant
  ↓
emit provider-neutral messaging event
  ↓
route to AutomationInstance
  ↓
Savings Workflow
```

### Required ingress properties

- publicly reachable HTTPS endpoint in production;
- provider verification/signature checks according to current provider contract;
- fast acknowledgement independent of long-running work;
- replay/deduplication protection;
- raw provider payload retention only as allowed by data policy;
- normalized event before domain logic;
- trace ID and tenant context before execution;
- bounded retry and incident creation;
- no secret values in logs.

## Outbound path

```text
Savings Workflow
  ↓
messaging.send
  ↓
WhatsApp adapter
  ↓
Meta Cloud API
  ↓
provider message ID
  ↓
side-effect receipt
  ↓
delivery/status webhook
  ↓
ExecutionEvent / ProcessRecord
```

Every outbound write requires an idempotency key and must preserve provider IDs sufficient for reconciliation.

## Tenant routing

Provider identifiers are configuration, not authorization.

A webhook event may identify a WABA/phone number, but the runtime must resolve that identifier through a server-side `ConnectorAccount` owned by exactly one tenant before any business action is executed.

Unknown or ambiguous provider identity:

```text
event
→ quarantine / incident
→ no business side effect
```

## Conversation policy

The first commercial version is not an autonomous sales agent.

Default behavior:

```text
known structured event / known intent
→ deterministic workflow

free-form message with useful semantic extraction
→ optional classifier/extractor
→ confidence + schema validation

low confidence / unsupported / sensitive
→ human queue
```

The model cannot grant itself authority to:
- issue refunds;
- modify financial records;
- create binding quotes outside configured rules;
- perform destructive actions;
- bypass messaging/provider policy.

## Runtime model

### Before funded pilot

Use:
- fixtures;
- captured/redacted example payloads;
- mocks;
- provider test assets where available;
- local runtime.

Do not provision persistent infrastructure merely to claim readiness.

### Funded pilot

Provision the smallest shared production surface that can provide:
- public HTTPS ingress;
- tenant isolation;
- secret storage;
- idempotency persistence;
- scheduled/durable follow-up where required;
- audit trail;
- health/incident visibility.

A dedicated runtime per tenant requires explicit security, compliance, volume or contractual justification.

## Client ownership

Prefer:
- Meta Business Portfolio: client-owned;
- WABA: client-owned;
- phone number: client-owned;
- CRM/Google Workspace: client-owned;
- business data: client-owned.

EM3RC0D receives scoped operating authority.

This reduces lock-in and makes offboarding possible without taking the client's channel or data hostage.

## Activation gate

A WhatsApp installation cannot become `CLIENT_CONFIGURED` until evidence exists for:

- client/provider account ownership;
- phone/WABA mapping;
- required permissions/scopes;
- webhook subscription;
- ingress verification;
- send healthcheck;
- receive healthcheck;
- idempotency test;
- tenant-isolation test;
- one controlled live inbound event;
- one controlled live outbound message where allowed;
- client acceptance of the operational flow;
- external cost ownership/quota documented.

## Failure examples

| Failure | Required behavior |
|---|---|
| duplicate webhook | dedupe; no repeated business side effect |
| unknown WABA/number | quarantine + incident |
| revoked token | connector unhealthy; no blind retries |
| provider temporary failure | bounded retry |
| malformed payload | reject/incident |
| AI intent uncertain | human review |
| outbound status failure | reconcile provider ID + incident if material |
| tenant mapping ambiguity | fail closed |
