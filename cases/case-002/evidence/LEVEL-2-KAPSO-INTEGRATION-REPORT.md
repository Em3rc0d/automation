# CASE-002 — Level 2 Kapso Integration Evidence

Status: **LIVE TESTING IN PROGRESS**

Branch: `docs/case-002-automotive-workshop-intake`

Tested source commit: `f847fed378bdaf6338c18f235be039d7ddcd3e1a`

This file is the evidence ledger for the first live-provider test of CASE-002. Repository/mock/runtime readiness is already green. Live Kapso and Railway bindings are now active; remaining work is provider/media/outbound evidence, not external infrastructure setup.

## Bound live test environment

- public HTTPS n8n endpoint: Railway `case002-n8n`;
- pinned runtime: n8n `2.38.7`;
- Kapso Sandbox WhatsApp number connected;
- Kapso event webhook configured for `Message received`, payload version `v2`, buffering disabled;
- Kapso webhook secret stored in an n8n Crypto credential, not Git;
- internal control-plane auth stored in an n8n Header Auth credential, not Git;
- control-plane test endpoint reachable only through Railway private networking;
- Free-tier discipline retained: single n8n concurrency slot, bounded retries/timeouts, private internal hop.

## Test A — signed inbound text

### Successful live path

Marker: `CASE002-L2-004`

Observed at Railway edge: `2026-09-15T00:28:26.958378962Z`.

Evidence:

- Kapso delivered `POST /webhook/adapters/kapso/whatsapp/messages`;
- Railway returned HTTP `200` in `210 ms` with no upstream error;
- n8n execution `#30` completed successfully in `188 ms`;
- `Calculate Kapso HMAC` completed successfully using credential-backed Crypto v2;
- `Verify Kapso Envelope` completed successfully;
- `Kapso Security Gate` followed the valid/true branch;
- `Normalize Kapso Message` produced a provider-neutral inbound envelope;
- `Post Normalized Message` completed successfully against the Railway-private control-plane endpoint;
- `Acknowledge Kapso Webhook` completed successfully;
- normalized fields observed include `providerPhoneNumberId`, `providerEventId`, `providerMessageId`, `threadId`, `senderId`, `messageType`, text and logical `idempotencyKey`;
- no Kapso webhook secret or internal auth token was committed to Git.

The successful execution followed earlier failed attempts that exposed a test-harness deadlock: with n8n production concurrency limited to `1`, posting the normalized event back into another webhook on the same n8n instance caused the ingress execution to wait on itself. The Level-2 harness was corrected to use the separate Railway-private control-plane endpoint. The outbound internal request is bounded to two attempts with a short wait, avoiding the prior 300-second blocking behavior.

Remaining evidence for Test A:

- replay the exact same logical/provider message and prove that downstream work is not duplicated;
- capture the control-plane idempotency decision for that replay.

Result: **PARTIAL PASS — LIVE SIGNED INBOUND PATH PASSED; REPLAY/IDEMPOTENCY PROOF PENDING**

## Test B — real image/media round-trip

Evidence to capture:

- inbound image message ID;
- provider media ID;
- MIME type;
- provider reported size;
- local SHA-256;
- provider SHA-256 comparison when supplied;
- Evidence storage reference;
- proof that short-lived download URL is not persisted downstream;
- proof that media bytes are absent from generic execution telemetry.

Result: **PENDING**

## Test C — real outbound reply

Evidence to capture:

- BusinessAction/idempotency reference created before send;
- exact adapter execution ID;
- returned provider message ID (`wamid` or equivalent Kapso result);
- correlation metadata;
- delivered/accepted provider state when available;
- confirmation that the provider POST was not blindly retried after an ambiguous outcome.

Result: **PENDING**

## Test D — ambiguous send outcome

Purpose: prove duplicate-customer-message protection.

Expected behavior:

1. outbound BusinessAction exists before provider call;
2. provider call has no blind automatic retry;
3. an ambiguous timeout/failure transitions the action into reconciliation/review state;
4. no second provider send occurs until the first outcome is reconciled or an operator explicitly authorizes replay.

Result: **PENDING**

## Level 2 pass gate

Level 2 is PASS only when all four tests above have evidence and:

- duplicate inbound delivery is harmless;
- media integrity is verified;
- no raw media leaks into generic logs;
- outbound provider IDs are persisted;
- ambiguous send does not result in automatic duplicate delivery;
- no secret value is committed to Git;
- provider/runtime evidence is tied to the exact tested commit/runtime version.

## Current repository evidence

The current CASE-002 branch already passes:

- Repository Certification;
- W1 Candidate Validation;
- W1 Release Validation;
- W2 Release Validation;
- Baseline Factory Validation;
- CASE-002 Readiness, including static checks, all five acceptance fixtures and pinned n8n runtime smoke.

The first real signed inbound text path is now also proven live. Level 2 remains in progress until replay/idempotency, real media, real outbound send, and ambiguous-send protection are evidenced.
