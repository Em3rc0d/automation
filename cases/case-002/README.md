# CASE-002 Materialization Bundle

Status: **READY TO TEST — MOCK/RUNTIME**

Authority: `../CASE-002-AUTOMOTIVE-WORKSHOP-SERVICE-INTAKE.md`

This directory turns CASE-002 from a design document into a traceable assembly/test package. `READY TO TEST` means the repository now contains executable acceptance fixtures, a dedicated readiness validator, a pinned-n8n runtime probe and the primary Kapso messaging adapters needed to begin controlled testing. It does **not** mean production certification.

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

## Test now

Static + deterministic acceptance:

```bash
python cases/case-002/tools/validate_readiness.py
python cases/case-002/tools/run_acceptance.py
```

Pinned n8n runtime smoke:

```bash
bash cases/case-002/tools/runtime_smoke.sh
```

Full instructions and the live Kapso checklist are in `TESTING.md`.

## WhatsApp adapter decision

Preferred pilot adapters:

1. **Kapso**
2. **OpenWA**

Direct Meta WhatsApp Cloud API remains a fallback/reference adapter. Business semantics stay provider-neutral.

### Kapso testable adapter surface

The primary Kapso path now has three HARDENED adapter candidates:

```text
messaging.receive
-> quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_RECEIVE@1.0

messaging.media.download
-> quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MEDIA_DOWNLOAD@1.0

messaging.send
-> quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_SEND@1.0
```

`KAPSO_MESSAGE_SEND@1.0` intentionally disables blind automatic retries of the provider send. Ambiguous provider outcomes must be reconciled before replay so a customer is not sent duplicate confirmations.

The packages include executable n8n workflow JSON, manifests, config schemas, fixtures, documentation and test plans. They remain **HARDENED**, not `TESTED`/`APPROVED_BASELINE`, until provider/runtime evidence is recorded through the certification pipeline.

OpenWA remains the secondary adapter target. Its specification is `workflows/adapters/messaging/OPENWA-WHATSAPP.md`; it does not block the first Kapso-backed CASE-002 test cycle.

## Acceptance surface

`fixtures/acceptance-fixtures.json` freezes five V1 paths:

1. usable leak photo -> appointment path;
2. unusable leak photo -> request better evidence;
3. scheduled maintenance -> appointment path without unnecessary media;
4. warranty/comeback -> human review;
5. roadside/tow request -> human escalation.

`runtime/case002-acceptance-probe.json` executes the routing/authority invariants inside pinned n8n without invoking external providers. Live provider validation is a separate test level.

## Files

- `assembly.yaml` — machine-readable assembly and test-readiness state.
- `QUARRY-TO-ASSEMBLY.md` — provenance/traceability from quarry evidence.
- `RUNTIME-SYNTHESIS.md` — production synthesis/certification queue.
- `WHATSAPP-ADAPTER-DECISION.md` — Kapso/OpenWA portability decision.
- `TESTING.md` — exact static, runtime and live-provider test procedure.
- `contracts/` — provider-neutral case contracts.
- `fixtures/acceptance-fixtures.json` — five V1 acceptance fixtures.
- `tools/validate_readiness.py` — dependency-free static readiness gate.
- `tools/run_acceptance.py` — deterministic fixture runner with external providers mocked.
- `tools/runtime_smoke.sh` — pinned n8n import/execution smoke.
- `runtime/case002-acceptance-probe.json` — n8n case acceptance probe.

## Existing hardened reuse

CASE-002 reuses rather than duplicates:

- `quarries/workflow-quarry/30-hardened/platform/EXECUTION_TELEMETRY@1.0`
- `quarries/workflow-quarry/30-hardened/platform/ERROR_TO_INCIDENT@1.0`

## Certification boundary

The following remain distinct:

```text
READY_TO_TEST
!= TESTED provider evidence
!= APPROVED_BASELINE
!= production pilot approval
```

Reusable capabilities/adapters still follow:

```text
HARDENED
-> RUNTIME_IMPORTABLE
-> TESTED
-> APPROVED_BASELINE
```

The business stages still marked `NEEDS_SYNTHESIS`, `IN_CERTIFICATION` or `CASE_POLICY` in `assembly.yaml` are exercised through the case test harness for acceptance purposes; that harness does not silently promote them into certified reusable baselines.

## Portable replication bundle

The current n8n/Gemini PoC can be reconstructed on Railway, a VPS, or local Docker from repository source. See:

- `cases/case-002/portable/workflow-index.json` — canonical workflow IDs and JSON source paths;
- `cases/case-002/portable/docker-compose.yml` — local/VPS stack;
- `cases/case-002/portable/.env.example` — environment template with no secrets;
- `cases/case-002/portable/README.md` — bootstrap, credential binding, one-shot composition and portability notes;
- `cases/case-002/portable/REPLICATION-CHECKLIST.md` — post-clone verification checklist.

Secrets, live credential IDs and persistent SQLite data are intentionally not committed.
