# CASE-002 Runtime Synthesis Queue

Status: **READY FOR FACTORY SYNTHESIS**

Factory authority: `factory/README.md`  
Certified runtime profile: `n8n-base-js-v1`, pinned n8n `2.38.7`.

This document converts CASE-002 into an implementation queue. It intentionally avoids promoting a monolithic `WORKSHOP_BOT` baseline. The assembly depends on small reusable packages plus case-domain policy.

## Adapter decision — WhatsApp

CASE-002 MUST keep WhatsApp business semantics provider-neutral through the messaging capability contract.

Preferred pilot adapters, in order of practical setup preference:

1. **Kapso**
2. **OpenWA**

Direct Meta WhatsApp Cloud API remains a fallback/reference adapter, not the default CASE-002 installation path.

This changes connector binding, authentication, webhook verification and media-fetch implementation details, but MUST NOT create separate business capabilities such as `KAPSO_INBOUND` or `OPENWA_MEDIA_FETCH`. The reusable semantics remain `WHATSAPP_INBOUND`, `WHATSAPP_MEDIA_FETCH`, `messaging.send`, `messaging.receive` and `messaging.media.download`.

Each adapter must document its own authentication, webhook authenticity/replay semantics, external message/media IDs, retry behavior, delivery state, rate limits where applicable, credential lifecycle and media-download behavior before it can be used in a productive pilot.

## Reuse immediately

These packages already exist at `HARDENED` and should be invoked by the CASE-002 runtime assembly rather than reimplemented:

1. `EXECUTION_TELEMETRY@1.0`
2. `ERROR_TO_INCIDENT@1.0`

They still require their normal TESTED/APPROVED promotion; CASE-002 does not bypass that gate.

## Synthesis tranche A — ingress and evidence

### A1. `WHATSAPP_INBOUND@1.0`

Quarry basis:
- Batch 005 A1/A2;
- Batch 006 webhook security principles.

Contract:
- verify inbound webhook according to the selected adapter contract;
- normalize tenant/provider/message/thread identifiers into one provider-neutral envelope;
- dedupe by provider message/event identifier;
- preserve provider name and provider IDs for audit/reconciliation;
- emit normalized message envelope;
- no media binary retained in logs.

Preferred adapters for the pilot:
- Kapso;
- OpenWA.

Direct Meta Cloud API is a fallback/reference implementation only.

Failure tests:
- duplicate webhook;
- invalid/replayed webhook according to adapter semantics;
- unsupported message type;
- provider retry;
- missing/corrupt provider message identifier.

### A2. `WHATSAPP_MEDIA_FETCH@1.0`

Quarry basis:
- Batch 005 A1/A2.

Contract:
- input provider + provider media ID + tenant/message context;
- fetch through the tenant's selected WhatsApp adapter credential;
- enforce type/size policy;
- persist provider media/source IDs;
- return binary to the next storage step without serializing it into execution telemetry;
- retries must not create duplicate Evidence records.

Adapter implementations required initially:
- Kapso;
- OpenWA.

Meta Cloud may be implemented later without changing the capability contract.

### A3. Evidence storage composition

This starts as adapter composition, not a new business capability:

```text
media binary
-> storage.file.put
-> storage.file.hash
-> Evidence record
```

Required properties:
- tenant-prefixed storage path;
- SHA-256 duplicate detection;
- provider source IDs;
- retention class;
- logs/reference only.

### A4. Visual assessment worker/subflow

Do **not** promote `VISUAL_EVIDENCE_ASSESS` yet.

First materialize it as a case-level composition:
- validate image usability;
- strict output against `contracts/visual-assessment.schema.json`;
- forbid diagnosis/safety/warranty conclusions;
- store `AutomatedObservation` separately from customer statement and technician findings;
- route uncertainty to human review.

Admission can be reconsidered only after reuse evidence from at least one additional vertical.

## Synthesis tranche B — service intake and routing

### B1. `WORK_REQUEST_INTAKE@1.0`

Quarry basis:
- support normalization/classification patterns from Batch 001/008;
- work-order semantics from the capability library.

For CASE-002 it receives/updates the `ServiceRequest` domain record.

Required:
- schema validation before state mutation;
- deterministic idempotency from tenant + conversation/message request;
- customer/vehicle references;
- source reference;
- explicit missing-data state.

### B2. Operational triage policy

Keep triage as tenant/case policy until cross-vertical evidence justifies a capability.

Input:
- ServiceRequest;
- customer-reported conditions;
- Evidence metadata;
- optional VisualAssessment;
- service history references.

Output:
- `contracts/triage-decision.schema.json`.

Decision authority:
- deterministic policy after model extraction;
- never mechanical diagnosis.

## Synthesis tranche C — appointment lifecycle

### C1. `APPOINTMENT_REQUEST@1.0`
### C2. `AVAILABILITY_CHECK@1.0`
### C3. `SLOT_HOLD@1.0`
### C4. `APPOINTMENT_CREATE@1.0`
### C5. `APPOINTMENT_CONFIRM@1.0`

Quarry basis:
- Batch 002 B-12;
- Batch 004 D-03 duplicate-family evidence;
- Batch 007 reliable calendar booking and Cal.com semantics.

Hardening changes versus mined templates:
- no static local slot list;
- real provider availability;
- race-safe slot hold;
- persist provider event/booking ID;
- retry-safe create;
- timezone explicit;
- provider adapter outside business semantics;
- confirmation send idempotent.

Initial calendar adapter: Google Calendar. Cal.com/Microsoft remain adapters, not forks.

Appointment confirmation returns through `messaging.send` using the tenant's configured WhatsApp adapter, initially Kapso or OpenWA.

## Synthesis tranche D — work request / pre-order

### D1. `WORK_ORDER_CREATE@1.0`

CASE-002 first implementation:
- if client has no DMS: persist a lightweight `PreWorkOrder` in Postgres;
- if client has DMS: create/reference external work order through adapter.

Required:
- source ServiceRequest ID;
- vehicle ID;
- appointment ID when present;
- status;
- provider/external ID;
- idempotency.

Do not turn Automation into a full workshop ERP.

## Human-review branches

V1 explicitly stops automation for:
- warranty/comeback eligibility;
- roadside/tow dispatch;
- ambiguous evidence with consequential interpretation;
- requests that cannot be safely routed from available facts.

These branches create/route a `HUMAN_REVIEW_TASK`.

## Factory order

```text
T0  existing platform primitives
    EXECUTION_TELEMETRY
    ERROR_TO_INCIDENT

T1  WHATSAPP_INBOUND
    WHATSAPP_MEDIA_FETCH
    + Kapso adapter
    + OpenWA adapter

T2  WORK_REQUEST_INTAKE
    case evidence storage + visual assessment composition

T3  APPOINTMENT_REQUEST
    AVAILABILITY_CHECK
    SLOT_HOLD
    APPOINTMENT_CREATE
    APPOINTMENT_CONFIRM

T4  WORK_ORDER_CREATE

T5  CASE-002 assembly E2E
```

Each reusable package must independently satisfy:

```text
HARDENED
-> RUNTIME_IMPORTABLE
-> TESTED
-> APPROVED_BASELINE
```

before the pilot can claim it is assembled entirely from certified pieces.

## E2E acceptance gate

The materialized runtime is ready for a controlled pilot only when all fixtures in `fixtures/acceptance-fixtures.json` pass and the following cross-cutting assertions hold:

- duplicate provider events do not duplicate ServiceRequests, Evidence, appointments, work orders or outbound confirmations;
- the same fixtures pass with either supported preferred WhatsApp adapter after adapter-specific normalization;
- media does not appear in execution-log payloads;
- every externally visible side effect has an idempotency strategy;
- external provider IDs are persisted;
- every failure reaches the incident path after retry exhaustion;
- every successful terminal path emits execution telemetry;
- customer-reported facts remain distinguishable from automated observations;
- no fixture can produce a mechanical diagnosis;
- warranty and roadside dispatch remain human-controlled in V1.
