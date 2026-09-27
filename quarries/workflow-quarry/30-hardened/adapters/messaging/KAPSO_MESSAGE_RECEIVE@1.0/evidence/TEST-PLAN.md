# KAPSO_MESSAGE_RECEIVE@1.0 — Test Plan

Status: **PLANNED / NOT YET EXECUTED**

This is not a `TEST-REPORT.md`; runtime execution evidence is still required before promotion.

## Runtime gate

Record:

- n8n `2.38.7`;
- runtime profile `n8n-base-js-v1`;
- mock/control-plane version;
- Kapso webhook secret fixture binding;
- internal control-plane credential binding.

## Required tests

### T01 — Import

Import `workflow.json` into the pinned runtime.

Expected: successful import, no bound credential IDs, no embedded secret.

### T02 — Valid signed v2 message

Use `fixtures/valid-kapso-v2-text.json`; compute the HMAC at test runtime with the fixture secret.

Expected:

- signature accepted;
- payload version/event accepted;
- one normalized message POST occurs;
- raw provider payload is not sent downstream;
- provider IDs are preserved;
- response to Kapso is HTTP 200.

### T03 — Invalid signature

Send the same body with a modified signature.

Expected: HTTP 401 and zero control-plane side effects.

### T04 — Missing idempotency header

Remove `X-Idempotency-Key`.

Expected: request rejected before business processing.

### T05 — Duplicate delivery

Send the same provider message twice with the same logical message ID.

Expected:

- both adapter attempts use `kapso:<phoneNumberId>:<messageId>`;
- control plane stores/dispatches one logical inbound message only.

### T06 — Unsupported v1/unknown event

Send payload version `v1` or a non-message event.

Expected: reject; no downstream side effect.

### T07 — Batched delivery

Send a Kapso batched payload.

Expected: V1 fails with `KAPSO_BATCH_NOT_SUPPORTED_V1`; provider configuration for the pilot therefore keeps buffering disabled.

### T08 — Malformed message

Remove `message.id` or provider phone-number ID.

Expected: fail visibly and do not forward an ambiguous event.

### T09 — Control-plane transient failure

Return 5xx twice and success on third request.

Expected: <=3 attempts with unchanged idempotency key and one logical stored event.

### T10 — Permanent control-plane failure

Return 5xx through retry exhaustion.

Expected: workflow fails and can be projected through `ERROR_TO_INCIDENT@1.0`.

### T11 — Secret/raw-payload review

Inspect workflow JSON and executions.

Expected:

- no webhook secret or internal auth secret in repository;
- no raw request body in the normalized control-plane message;
- no media binary in logs/telemetry.

## Evidence required for TESTED

Create `evidence/TEST-REPORT.md` with exact runtime SHA/version, execution IDs, request/response evidence, duplicate count, retry evidence, credential-binding method, leak scan and final verdict.
