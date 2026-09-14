# CASE-002 Materialization Bundle

Status: **ASSEMBLY CANDIDATE / NOT APPROVED_BASELINE**

Authority: `cases/CASE-002-AUTOMOTIVE-WORKSHOP-SERVICE-INTAKE.md`

This directory converts CASE-002 from a design narrative into a traceable assembly package that can be taken through the repository factory. It does **not** certify any new baseline by itself.

## V1 materialized path

```text
Meta WhatsApp webhook
  -> verify/dedupe provider event
  -> normalize message/thread/customer context
  -> resolve/request vehicle
  -> create/update ServiceRequest
  -> decide missing information
  -> request evidence when policy requires it
  -> fetch media
  -> validate/hash/store Evidence
  -> optional multimodal VisualAssessment
  -> deterministic operational triage
  -> HUMAN_REVIEW or APPOINTMENT
  -> availability
  -> slot hold
  -> appointment create
  -> pre-work-order create
  -> customer confirmation
  -> execution telemetry
  -> incident path on failure
```

## What is reused directly

Two platform primitives already exist as `HARDENED` factory packages and are referenced, not duplicated:

- `quarries/workflow-quarry/30-hardened/platform/EXECUTION_TELEMETRY@1.0`
- `quarries/workflow-quarry/30-hardened/platform/ERROR_TO_INCIDENT@1.0`

The remaining blocks are mapped to mined quarry evidence and are queued for repository-native synthesis/hardening. See `QUARRY-TO-ASSEMBLY.md` and `RUNTIME-SYNTHESIS.md`.

## Case-local domain contracts

The following are case-domain records, not automatically new toolbox capabilities:

- `Vehicle`
- `ServiceRequest`
- `CustomerReportedCondition`
- `Evidence`
- `AutomatedObservation`

Schemas in `contracts/` freeze the V1 exchange boundaries needed by the assembly.

## Permanent authority boundary

```text
CustomerReportedCondition
!= AutomatedObservation
!= TechnicianFinding
!= Diagnosis
```

A model may classify, summarize and describe visible evidence. It must not create a definitive mechanical diagnosis, declare a vehicle safe to drive, approve warranty coverage or authorize repair.

## Evidence policy

Media binaries are stored in object storage. Process records and execution logs store references/metadata only.

```text
WhatsApp media
  -> object storage
  -> Evidence(storageReference, hash, metadata)
  -> optional AutomatedObservation

execution logs
  -> evidenceId/reference only
```

## Acceptance fixtures

`fixtures/acceptance-fixtures.json` materializes the minimum branches that the first runtime assembly must pass:

1. fluid leak + usable image;
2. fluid leak + unusable image;
3. scheduled maintenance without media;
4. warranty/comeback requiring human review;
5. roadside assistance requiring human escalation because dispatch is not yet a certified capability.

## Promotion boundary

Nothing under this case directory should be copied into `workflows/n8n/` as `APPROVED_BASELINE` merely because the case works.

Reusable semantic blocks must pass the normal factory path:

```text
quarry evidence
-> repository-native synthesis
-> HARDENED
-> RUNTIME_IMPORTABLE
-> TESTED
-> APPROVED_BASELINE
```

The case-level orchestrator is an assembly proof. Reusable components are promoted independently.
