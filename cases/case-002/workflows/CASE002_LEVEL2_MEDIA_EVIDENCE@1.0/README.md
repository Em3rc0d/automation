# CASE002_LEVEL2_MEDIA_EVIDENCE@1.0

Status: **CASE-LOCAL LEVEL-2 TEST COMPOSITION — NOT PRODUCTION STORAGE**

This workflow closes the CASE-002 Level-2 test orchestration boundary between the hardened Kapso media adapter and the `Evidence` contract without pretending that production object storage has already been synthesized.

## Purpose

```text
KAPSO_MEDIA_DOWNLOAD@1.0
-> write binary to the persistent n8n test volume
-> read it back
-> SHA-256 verify persisted bytes
-> emit CASE-002 Evidence metadata
```

The workflow calls the existing `kapsoMediaDownloadV1` supporting workflow by stable ID. It does not duplicate Kapso authentication or media-download logic.

## Input

Required:

```text
tenantId
serviceRequestId
providerPhoneNumberId
providerMessageId
mediaId
traceId
```

Optional:

```text
expectedMediaType
maxBytes
idempotencyKey
evidenceId
receivedAt
```

## Storage boundary

For Level 2 only, the binary is written under:

```text
/home/node/.n8n/storage/
```

using a tenant-scoped, content-addressed filename. The emitted reference uses:

```text
test-local-volume://case002/<tenant>/sha256/<sha256>.<ext>
```

The workflow re-reads the stored file and verifies that its SHA-256 matches the hash returned by `KAPSO_MEDIA_DOWNLOAD@1.0`.

This is deliberately **not** the production `storage.file.put` baseline. Level 3 / productive use still requires real object storage (test/prod bucket or another admitted storage adapter), tenant isolation, lifecycle/retention controls, and durable duplicate indexing.

## Evidence output

The final item follows `cases/case-002/contracts/evidence.schema.json` and contains metadata only. Media bytes are intentionally omitted from the final JSON/binary output so generic downstream telemetry can carry an Evidence reference without carrying the media itself.

Current defaults:

```text
source: whatsapp
validationStatus: valid
analysisStatus: not_requested
retentionClass: level2-test
```

## Safety / authority boundary

This workflow stores and verifies evidence. It does not interpret the media, diagnose a mechanical condition, decide warranty eligibility, or decide whether a vehicle is safe to drive.

## Runtime

Target runtime: n8n `2.38.7`.

The workflow must remain inactive until imported into the controlled Level-2 environment and its supporting Kapso workflow/credential setup is verified. No credentials or secret values are stored in this source.
