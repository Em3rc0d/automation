# CASE-002 Runtime Synthesis Queue

Status: **READY TO TEST — KAPSO T1 HARDENED / CASE HARNESS EXECUTABLE**

Factory authority: `factory/README.md`  
Certified runtime profile: `n8n-base-js-v1`, pinned n8n `2.38.7`.

This document converts CASE-002 into an implementation/certification queue. It intentionally avoids promoting a monolithic `WORKSHOP_BOT` baseline. The case is now ready for mocked/pinned-runtime testing while reusable business components continue through their independent factory gates.

## Test-readiness boundary

The repository now contains:

```text
cases/case-002/tools/validate_readiness.py
cases/case-002/tools/run_acceptance.py
cases/case-002/runtime/case002-acceptance-probe.json
cases/case-002/tools/runtime_smoke.sh
.github/workflows/case-002-readiness.yml
```

This means the five frozen CASE-002 branches can be executed with external providers mocked, and the Kapso adapter workflows can be imported into the pinned runtime. See `TESTING.md` for live-provider progression.

`READY TO TEST` is not `TESTED` provider evidence and is not `APPROVED_BASELINE`.

## Adapter decision — WhatsApp

CASE-002 MUST keep WhatsApp business semantics provider-neutral through the messaging capability contract.

Preferred pilot adapters:

1. **Kapso**
2. **OpenWA**

Direct Meta WhatsApp Cloud API remains a fallback/reference adapter.

Canonical connector boundaries:

```text
messaging.receive
messaging.send
messaging.thread.read
messaging.media.download
```

Provider-specific implementations are **ADAPTER** artifacts and do not increase the business capability count.

## Reuse immediately

Existing platform HARDENED packages:

1. `EXECUTION_TELEMETRY@1.0`
2. `ERROR_TO_INCIDENT@1.0`

CASE-002 references these packages instead of duplicating platform error/telemetry logic.

## Synthesis tranche A — Kapso messaging and evidence ingress

### A1. Kapso `messaging.receive` — HARDENED

Package:

```text
quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_RECEIVE@1.0
```

Implemented boundary:
- `whatsapp.message.received` payload v2;
- HMAC-SHA256 webhook verification;
- provider event/message/thread/phone IDs preserved;
- stable logical idempotency key;
- provider-neutral inbound envelope;
- no media binary in generic telemetry;
- tenant resolution deferred to trusted control-plane connector mapping.

### A2. Kapso `messaging.media.download` — HARDENED

Package:

```text
quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MEDIA_DOWNLOAD@1.0
```

Implemented boundary:
- media metadata lookup;
- size policy before download;
- strict production download-host validation;
- short-lived URL removed from downstream output;
- local SHA-256 verification;
- binary remains binary for Evidence storage composition.

Next composition:

```text
KAPSO_MEDIA_DOWNLOAD
-> storage.file.put
-> storage.file.hash / verify
-> Evidence record
```

### A3. Kapso `messaging.send` — HARDENED

Package:

```text
quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_SEND@1.0
```

Implemented V1 boundary:
- text messages;
- provider-neutral input;
- requires preallocated `businessActionId` + `idempotencyKey`;
- calls Kapso `/{phone_number_id}/messages`;
- persists provider `wamid` in normalized output;
- sends `businessActionId` through `biz_opaque_callback_data` for reconciliation;
- **no automatic retry of the provider send**.

The last rule is intentional. A provider timeout can be ambiguous after the message was accepted. Blind replay may duplicate a customer confirmation. Therefore:

```text
ambiguous provider result
-> UNKNOWN / reconcile
-> provider status/webhook or operator decision
-> only then consider replay
```

### A4. OpenWA — DESIGNED / SECONDARY TARGET

Specification:

```text
workflows/adapters/messaging/OPENWA-WHATSAPP.md
```

OpenWA remains secondary because it adds session/browser lifecycle and reconnect responsibilities. It must map into the same canonical messaging contracts without changing CASE-002 domain schemas.

### A5. Evidence storage composition — PRODUCTION SYNTHESIS STILL REQUIRED

This remains adapter composition, not a new business capability:

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

### A6. Visual assessment — CASE COMPOSITION

Do **not** promote `VISUAL_EVIDENCE_ASSESS` yet.

First implementation remains case-local:
- validate image usability;
- strict output against `contracts/visual-assessment.schema.json`;
- forbid diagnosis/safety/warranty conclusions;
- store `AutomatedObservation` separately from customer statement and technician findings;
- route uncertainty to human review.

## Synthesis tranche B — service intake and routing

### B1. `WORK_REQUEST_INTAKE@1.0`

Production reusable synthesis still required.

For CASE-002 testing, the case acceptance harness exercises the frozen `ServiceRequest` and routing contract without pretending that this block is already an approved reusable baseline.

Required production properties:
- schema validation before mutation;
- deterministic idempotency from tenant + conversation/message request;
- customer/vehicle references;
- source reference;
- explicit missing-data state.

### B2. Operational triage policy

Remain tenant/case policy until cross-vertical evidence justifies a reusable capability.

Input:
- ServiceRequest;
- customer-reported conditions;
- Evidence metadata;
- optional VisualAssessment;
- service history references.

Output: `contracts/triage-decision.schema.json`.

Authority: deterministic operational routing after extraction; never mechanical diagnosis.

## Synthesis tranche C — appointment lifecycle

Production components remain in certification:

```text
APPOINTMENT_REQUEST@1.0
AVAILABILITY_CHECK@1.0
SLOT_HOLD@1.0
APPOINTMENT_CREATE@1.0
APPOINTMENT_CONFIRM@1.0
```

Required hardening versus mined examples:
- real provider availability;
- race-safe slot hold;
- persist provider event/booking ID;
- retry-safe create;
- explicit timezone;
- provider adapter outside business semantics;
- outbound confirmation routed through `messaging.send`.

Initial calendar adapter remains Google Calendar; Cal.com/Microsoft stay adapter choices.

The CASE-002 mock acceptance harness represents the appointment side effects as expected actions. It does not certify the real calendar lifecycle.

## Synthesis tranche D — work request / pre-order

### D1. `WORK_ORDER_CREATE@1.0`

Production reusable synthesis still required.

Pilot target:
- no DMS: lightweight `PreWorkOrder` in Postgres;
- existing DMS: create/reference external work order through adapter.

Do not turn Automation into a full workshop ERP.

## Human-review branches

V1 deliberately stops automation for:
- warranty/comeback eligibility;
- roadside/tow dispatch;
- ambiguous evidence with consequential interpretation;
- requests that cannot be safely routed from available facts.

## Factory/test order

```text
T0  platform primitives
    EXECUTION_TELEMETRY                    [HARDENED]
    ERROR_TO_INCIDENT                      [HARDENED]

T1  Kapso messaging adapters
    KAPSO_MESSAGE_RECEIVE                  [HARDENED]
    KAPSO_MEDIA_DOWNLOAD                   [HARDENED]
    KAPSO_MESSAGE_SEND                     [HARDENED]
    OpenWA receive/media/send              [DESIGNED-MINED / secondary]

TEST HARNESS
    static readiness                       [EXECUTABLE]
    five acceptance fixtures               [EXECUTABLE]
    pinned n8n case probe                  [EXECUTABLE]
    dedicated CI readiness workflow        [ENABLED]

T2  WORK_REQUEST_INTAKE                    [PRODUCTION SYNTHESIS REQUIRED]
    Evidence storage                       [PRODUCTION SYNTHESIS REQUIRED]
    visual assessment composition          [CASE IMPLEMENTATION REQUIRED]

T3  appointment lifecycle                  [IN CERTIFICATION]

T4  WORK_ORDER_CREATE                      [PRODUCTION SYNTHESIS REQUIRED]

T5  live CASE-002 controlled pilot         [AFTER LIVE PROVIDER/BOUNDARY TESTS]
```

## E2E acceptance gate

The mocked/runtime project is test-ready when:

- `validate_readiness.py` passes;
- `run_acceptance.py` passes all five fixtures;
- `runtime_smoke.sh` imports all three Kapso adapters into n8n `2.38.7`;
- `case002AcceptanceProbeV1` executes successfully;
- repository/factory CI remains green.

A controlled live pilot requires additional evidence:

- Kapso signed webhook test;
- duplicate webhook test;
- real media retrieval/hash/storage test;
- real outbound send + `wamid` persistence test;
- ambiguous-send/no-blind-retry test;
- real test calendar availability/hold/create flow;
- test-tenant Evidence persistence;
- safe multimodal assessment;
- human-review branches;
- telemetry/incident capture.

Reusable components still independently progress through:

```text
HARDENED
-> RUNTIME_IMPORTABLE
-> TESTED
-> APPROVED_BASELINE
```
