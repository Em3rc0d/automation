# CASE-002 — Quarry to Assembly Traceability

Status: **MATERIALIZATION TRACEABILITY**

This file records exactly which mined patterns support each CASE-002 block and what is reused versus rebuilt. Raw external workflows are not copied into the case.

## Mapping

| CASE-002 block | Quarry evidence | Extracted pattern | Materialization decision |
|---|---|---|---|
| WhatsApp inbound | Batch 005 A1/A2 | inbound message/media, provider reply path | synthesize provider-neutral `WHATSAPP_INBOUND`; Meta adapter first |
| Provider webhook safety | Batch 006 Standard Webhooks | message ID, timestamp, signature, replay window, idempotency | provider-specific Meta verification at ingress + platform idempotency |
| Media fetch | Batch 005 A1/A2 | WhatsApp media download before extraction | synthesize `WHATSAPP_MEDIA_FETCH`; preserve provider message/media IDs |
| Original media preservation | Batch 005 A2/A4 + document family | archive original before downstream extraction | object storage first; logs keep only evidence references |
| Evidence quality/relevance | Batch 005 paperflow principles | confidence, source checking, human review | repository-native visual assessment contract; no copied code |
| AI structured extraction | Batch 001 A-03 + Batch 005 invoice families | constrained classification / strict structured output | strict schema output; deterministic routing after model output |
| Service-request classification | Batch 001 A-03; Batch 008 support/SLA | validate, classify, prioritize, route, escalate | reuse support-triage pattern but model workshop semantics in case domain |
| Human review | Batch 001 A-04/A-05; Batch 006 durable approval; Batch 008 | consequential side effects behind review/approval | V1 routes uncertainty/warranty/urgent cases to `HUMAN_REVIEW_TASK` |
| Appointment request | Batch 002 B-12; Batch 004 D-03 duplicate family | intake -> approval -> calendar | synthesize provider-neutral appointment blocks; do not reuse static slot UI |
| Availability | Batch 002 B-12 blockers; Batch 007 reliable booking | real-time availability required before booking | `AVAILABILITY_CHECK` against selected calendar/booking adapter |
| Slot concurrency | Batch 002 emerging decomposition; Batch 007 | prevent double-booking, persist provider ID | `SLOT_HOLD` required before create |
| Appointment create | Batch 002 B-12 + Google Calendar; Batch 007 Cal.com semantics | create after validated/held slot, persist external ID | `APPOINTMENT_CREATE`; Google Calendar first adapter |
| Confirmation/reminder | Batch 007 reliable calendar booking | confirmations and reminders | `APPOINTMENT_CONFIRM`, later `APPOINTMENT_REMIND` |
| Work request/pre-order | SMB capability library + certification Priority-A work-order gap | request -> work order -> assignment -> completion | synthesize `WORK_REQUEST_INTAKE` + `WORK_ORDER_CREATE`; pilot may persist pre-order in Postgres |
| Telemetry | existing HARDENED package | tenant-scoped idempotent execution event | reuse `EXECUTION_TELEMETRY@1.0` unchanged |
| Failure projection | existing HARDENED package | normalized error -> incident | reuse `ERROR_TO_INCIDENT@1.0` unchanged |
| Savings | control-plane/Savings architecture | automated units, exceptions, oversight, variable cost | emit metrics through telemetry; Savings Engine remains control-plane authority |
| Roadside/tow | CASE-002 + certification Priority-A field service gap | field resource assignment/ETA/status | **not automated in V1**; human escalation; candidate `FIELD_SERVICE_DISPATCH` needs admission review |
| Warranty/comeback | CASE-002 discovery | history + policy + consequential decision | **human review in V1**; do not admit capability yet |

## Quarry patterns explicitly rejected for direct reuse

### Static slot generation

The strongest mined appointment workflow (`B-12`) builds selectable date/time choices locally. CASE-002 rejects that behavior because it does not prove current availability and has a race condition.

### Spreadsheet as source of truth

Several mined candidates use Google Sheets for business state. CASE-002 keeps state in the control plane/Postgres or an authorized client system and treats Sheets only as an optional adapter.

### Unrestricted agent tool authority

Mined AI-agent candidates can call CRM/calendar tools directly. CASE-002 instead uses:

```text
model structured output
-> schema validation
-> deterministic policy
-> approval/human gate when required
-> side effect
```

### AI diagnosis

No mined classification/extraction pattern is promoted into mechanical diagnosis authority. Visual analysis remains observational.

### Raw external workflow redistribution

Aggregation-corpus license metadata does not automatically prove per-workflow redistribution rights. CASE-002 uses patterns/provenance and performs repository-native synthesis.

## Source evidence index

- Batch 001: `quarries/workflow-quarry/mining-batches/2026-09-11-batch-001.md`
- Batch 002: `quarries/workflow-quarry/mining-batches/2026-09-11-batch-002.md`
- Batch 004: `quarries/workflow-quarry/mining-batches/2026-09-11-batch-004.md`
- Batch 005: `quarries/workflow-quarry/mining-batches/2026-09-11-batch-005-whatsapp-document-accounting.md`
- Batch 006: `quarries/workflow-quarry/mining-batches/2026-09-11-batch-006-control-plane-infrastructure.md`
- Batch 007: `quarries/workflow-quarry/mining-batches/2026-09-11-batch-007-common-smb-capability-sweep.md`
- Batch 008: `quarries/workflow-quarry/mining-batches/2026-09-11-batch-008-certification-gap-sweep.md`
- Factory authority: `factory/README.md`
- Coverage authority: `certification/CAPABILITY-COVERAGE-MAP.md`

## Result

CASE-002 is not based on one workshop-specific workflow. It is an assembly of independently reusable patterns:

```text
secure messaging
+ media evidence
+ structured classification
+ human review
+ appointment lifecycle
+ work-order intake
+ platform telemetry/incidents
```

That is the intended toolbox model.
