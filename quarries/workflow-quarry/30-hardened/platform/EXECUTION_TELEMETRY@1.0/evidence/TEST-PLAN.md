# EXECUTION_TELEMETRY@1.0 — Test Plan

Status: **PLANNED / NOT YET EXECUTED**

This file is intentionally not named `TEST-REPORT.md`. Promotion to TESTED requires actual runtime evidence.

## Runtime gate

Pin and record:

- n8n version;
- execution mode;
- Node.js/runtime version if relevant;
- mock/control-plane endpoint build/version;
- credential binding method.

## Required tests

### T01 — Import

Import `workflow.json` into the pinned n8n runtime.

Expected: workflow imports without mutation/error and required credential remains unbound rather than containing any secret.

### T02 — Valid event

Input: `fixtures/valid.json`.

Expected:

- validation passes;
- normalized schemaVersion=`1.0`;
- POST occurs exactly once;
- `Idempotency-Key` equals the deterministic key;
- receiver returns success;
- output is the receiver acknowledgement.

### T03 — Missing tenant

Input: `fixtures/invalid-missing-tenant.json`.

Expected:

- workflow fails at `Normalize and Validate Event`;
- error includes `EXECUTION_TELEMETRY_INVALID_INPUT`;
- zero HTTP side effects occur.

### T04 — Duplicate replay

Run `fixtures/valid.json`, then `fixtures/duplicate.json` against a receiver that persists idempotency keys.

Expected:

- both requests carry the same logical key;
- receiver stores one logical execution event only;
- second response is safe/idempotent and does not double-count metrics.

### T05 — Transient receiver failure

Receiver returns retryable 5xx twice, then success.

Expected:

- maximum observed attempts <= 3;
- identical idempotency key on all attempts;
- one logical event stored;
- final workflow result succeeds.

### T06 — Permanent receiver failure

Receiver returns 5xx for all attempts.

Expected:

- attempts stop after configured limit;
- workflow fails visibly;
- no silent success;
- parent orchestration can route the failure into `ERROR_TO_INCIDENT@1.0`.

### T07 — Invalid timestamp

Use a fixture with non-date `occurredAt`.

Expected: validation/normalization fails rather than emitting an ambiguous timestamp.

### T08 — Secret scan

Search package content for common secret/token patterns and client-specific identifiers.

Expected: zero embedded secrets and zero real tenant/client IDs.

### T09 — PII/logging review

Inspect normal and failed executions.

Expected: operational logs contain only fixture data and contract metadata; no credentials or auth-header values are emitted.

### T10 — Config failure

Run without `AUTOMATION_CONTROL_PLANE_URL` or without the credential binding.

Expected: explicit configuration failure; no fallback to an unsafe/public endpoint.

## Evidence required for TESTED

Create `evidence/TEST-REPORT.md` containing:

- exact runtime versions;
- execution IDs;
- test result per T01–T10;
- receiver/mock evidence;
- duplicate-count evidence;
- retry evidence;
- secret-scan result;
- discovered deviations and remediation;
- final TESTED or NO_PASS_VERIFIED decision.
