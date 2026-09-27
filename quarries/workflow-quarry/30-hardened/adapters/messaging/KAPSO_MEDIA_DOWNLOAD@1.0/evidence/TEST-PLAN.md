# KAPSO_MEDIA_DOWNLOAD@1.0 — Test Plan

Status: **PLANNED / NOT YET EXECUTED**

This is not a `TEST-REPORT.md`; runtime evidence is still required.

## Runtime gate

Record:

- n8n `2.38.7`;
- runtime profile `n8n-base-js-v1`;
- provider/mock endpoint version;
- Kapso API-key credential binding method;
- binary-data storage mode.

## Required tests

### T01 — Import

Import `workflow.json` into the pinned runtime.

Expected: successful import with no bound credential ID and no embedded secret.

### T02 — Valid image

Input: `fixtures/valid-image.json` with provider/mock metadata and bytes.

Expected:

- metadata retrieved;
- file size accepted before binary download;
- download URL accepted only from the expected host;
- binary returned in `data`;
- local SHA-256 equals provider SHA-256;
- temporary download URL is absent from final output.

### T03 — Missing required input

Remove `tenantId`, `providerPhoneNumberId`, `providerMessageId`, `mediaId` or `traceId`.

Expected: fail before any HTTP request.

### T04 — Oversize metadata

Provider metadata reports `file_size > maxBytes`.

Expected: fail before media bytes are downloaded.

### T05 — Disallowed download host

Provider metadata supplies a non-HTTPS or non-`api.kapso.ai` download URL.

Expected: fail before binary download.

### T06 — Hash match

Provider SHA-256 matches the downloaded file.

Expected: success and normalized `sha256` equals the local hash.

### T07 — Hash mismatch

Provider SHA-256 differs from the downloaded file.

Expected: fail with `KAPSO_MEDIA_HASH_MISMATCH`; no Evidence record should be created by the caller.

### T08 — Provider transient failure

Metadata or binary endpoint returns retryable 5xx twice, then success.

Expected: <=3 attempts for the affected request and final success.

### T09 — Provider permanent failure

Provider continues returning 5xx through retry exhaustion.

Expected: workflow fails visibly and parent orchestration can invoke `ERROR_TO_INCIDENT@1.0`.

### T10 — Binary/logging review

Inspect successful and failed executions.

Expected:

- no base64/binary copied into JSON telemetry;
- no short-lived `download_url` in final output;
- no API key in workflow JSON or execution payloads.

### T11 — Evidence handoff idempotency

Invoke the same media request twice.

Expected: both invocations produce the same `idempotencyKey`; downstream Evidence creation stores one logical Evidence object.

## Evidence required for TESTED

Create `evidence/TEST-REPORT.md` with exact runtime versions, execution IDs, mock/provider evidence, retry counts, hash evidence, leak scan and final verdict.
