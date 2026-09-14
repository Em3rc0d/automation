# CASE-002 Materialization Bundle

Status: **ASSEMBLY CANDIDATE / FACTORY SYNTHESIS IN PROGRESS**

Authority: `../CASE-002-AUTOMOTIVE-WORKSHOP-SERVICE-INTAKE.md`

This directory turns CASE-002 from a design document into a traceable assembly plan that can be manufactured through the certified Baseline Factory without copying a monolithic external workflow.

## V1 materialized path

```text
WhatsApp
-> provider-normalized inbound message
-> ServiceRequest / customer + vehicle context
-> optional evidence request
-> media fetch
-> Evidence storage + hash
-> optional structured visual assessment
-> deterministic operational triage
-> appointment request / availability / hold / create
-> pre-work-order
-> confirmation
-> execution telemetry / incident path
```

## WhatsApp adapter decision

Preferred pilot adapters:

1. **Kapso**
2. **OpenWA**

Direct Meta WhatsApp Cloud API remains a fallback/reference adapter. The business-semantic workflow remains provider-neutral. See `WHATSAPP-ADAPTER-DECISION.md`.

### Current T1 implementation

The primary Kapso inbound/media path is now materialized as HARDENED adapter candidates:

```text
messaging.receive
-> quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_RECEIVE@1.0

messaging.media.download
-> quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MEDIA_DOWNLOAD@1.0
```

These packages include executable n8n workflow JSON, manifests, config schemas, fixtures, documentation and runtime test plans. They are **not** `TESTED` or `APPROVED_BASELINE` until factory/runtime evidence is recorded.

OpenWA is specified at `workflows/adapters/messaging/OPENWA-WHATSAPP.md` and remains the secondary adapter implementation target after the Kapso canonical envelope is proven.

Provider-specific artifacts remain `ADAPTER`s. They do not create business capabilities named after Kapso or OpenWA.

## Files

- `assembly.yaml` — machine-readable case assembly and current stage of each component.
- `QUARRY-TO-ASSEMBLY.md` — provenance/traceability from quarry evidence into CASE-002 blocks.
- `RUNTIME-SYNTHESIS.md` — ordered factory synthesis queue and current implementation state.
- `WHATSAPP-ADAPTER-DECISION.md` — binding policy for Kapso/OpenWA and portability requirements.
- `contracts/` — stable provider-neutral contracts for service requests, evidence, visual assessment and triage.
- `fixtures/acceptance-fixtures.json` — materialized branch fixtures for E2E acceptance.

## Certification boundary

CASE-002 does not promote anything automatically. Reusable capability/adapter packages must still pass:

```text
HARDENED
-> RUNTIME_IMPORTABLE
-> TESTED
-> APPROVED_BASELINE
```

The case may use CASE-specific policy/configuration and domain records without converting every entity or decision into a new toolbox capability.

## Existing hardened reuse

CASE-002 reuses rather than duplicates:

- `quarries/workflow-quarry/30-hardened/platform/EXECUTION_TELEMETRY@1.0`
- `quarries/workflow-quarry/30-hardened/platform/ERROR_TO_INCIDENT@1.0`

The current branch additionally contains the two Kapso HARDENED adapter candidates listed above. All remaining V1 business blocks continue according to `assembly.yaml`.
