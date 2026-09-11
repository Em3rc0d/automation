# ERROR_TO_INCIDENT@1.0 — Test Plan

Status: **PLANNED / NOT YET EXECUTED**

## Runtime gate

Record exact n8n/runtime versions and the mock/control-plane incident endpoint build.

## Required tests

### T01 — Import
Import `workflow.json` into the pinned n8n runtime.

Expected: clean import; credential remains unbound; no secret/client ID appears in the imported workflow.

### T02 — Valid incident
Input: `fixtures/valid.json`.

Expected:
- normalized incident schemaVersion=`1.0`;
- status=`open`;
- one POST to `/internal/incidents`;
- stable idempotency header;
- receiver acknowledgement returned.

### T03 — Missing tenant
Input: `fixtures/invalid-missing-tenant.json`.

Expected:
- validation fails with `ERROR_TO_INCIDENT_INVALID_INPUT`;
- zero HTTP side effects.

### T04 — Redaction
Input: `fixtures/redaction.json`.

Expected:
- outbound message does not contain original bearer token, token value or password value;
- redacted placeholders are present;
- incident still preserves useful code/context.

### T05 — Duplicate replay
Execute `fixtures/valid.json` and then `fixtures/duplicate.json` with receiver idempotency enabled.

Expected:
- one logical incident record;
- duplicate request cannot increment incident count twice.

### T06 — Transient endpoint failure
Receiver returns 5xx twice then success.

Expected:
- <=3 attempts;
- same Idempotency-Key each time;
- one logical incident after eventual success.

### T07 — Permanent endpoint failure
Receiver returns 5xx for all attempts.

Expected:
- workflow fails after retry limit;
- no silent completion;
- orchestration can surface that incident projection itself failed.

### T08 — Timestamp validation
Use invalid `occurredAt`.

Expected: fail rather than transport an ambiguous timestamp.

### T09 — Long error message
Send error message >4000 characters.

Expected: transported text is bounded as documented.

### T10 — Secret/PII inspection
Inspect package, execution input/output and logs.

Expected:
- no embedded credentials;
- auth header value not printed by our workflow logic;
- raw provider credential objects are absent.

## Evidence required for TESTED

Create `evidence/TEST-REPORT.md` with exact execution IDs, result for T01–T10, redacted outbound payload proof, receiver duplicate-count evidence, retry observations, deviations/remediation and final TESTED or NO_PASS_VERIFIED decision.
