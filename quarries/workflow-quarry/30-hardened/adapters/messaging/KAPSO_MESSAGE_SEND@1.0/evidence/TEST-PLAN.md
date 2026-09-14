# KAPSO_MESSAGE_SEND@1.0 — Test Plan

Status: **PLANNED / NOT YET TESTED AGAINST LIVE KAPSO**

## T01 — Pinned-runtime import

Import `workflow.json` into n8n `2.38.7` under profile `n8n-base-js-v1`.

Expected: clean import, no bound credential reference and no embedded API key.

## T02 — Valid text send

Input: `fixtures/valid.json` with a controlled Kapso test/pilot phone number and test recipient.

Expected:

- exactly one provider POST;
- request path contains configured `providerPhoneNumberId`;
- `biz_opaque_callback_data` equals `businessActionId`;
- returned `messages[0].id` becomes `providerMessageId`;
- `retrySafe=false` in normalized output.

## T03 — Missing BusinessAction

Input: `fixtures/invalid-missing-business-action.json`.

Expected: fail at `Validate Send Request` with zero provider network calls.

## T04 — Invalid recipient/text

Test empty recipient and text longer than 4096 characters.

Expected: fail before the provider side effect.

## T05 — Provider 4xx

Mock/provider returns an authentication or validation error.

Expected: workflow fails visibly and does not retry the send.

## T06 — Ambiguous timeout / 5xx

Simulate a timeout or provider 5xx after the request may have reached the provider.

Expected:

- no automatic retry by this adapter;
- caller records UNKNOWN/needs-reconciliation state;
- no second provider POST is attempted automatically.

## T07 — Correlation

Verify outbound provider webhook/status, when available, echoes or preserves the `biz_opaque_callback_data` correlation value expected by the integration.

Expected: result can be linked back to the platform `businessActionId` without message-body matching.

## T08 — Secret/PII review

Inspect workflow definition and execution logs.

Expected:

- no API key embedded or printed;
- no auth header in logs;
- customer text is not copied into generic telemetry payloads;
- only the adapter execution itself sees the outbound text body.

## Evidence required for TESTED

Create `evidence/TEST-REPORT.md` with exact n8n version, provider/test account identifiers in redacted form, execution IDs, request count evidence, provider message ID evidence, ambiguous-failure evidence and final verdict.
