# CASE-002 — Level 2 Kapso Integration Evidence

Status: **BLOCKED ON EXTERNAL BINDINGS**

Branch: `docs/case-002-automotive-workshop-intake`

This file is the evidence ledger for the first live-provider test of CASE-002. Repository/mock/runtime readiness is already green. Level 2 begins only when a public n8n test endpoint and a Kapso test project/number are bound.

## Current external blocker

A dedicated Railway test project was attempted for the live n8n endpoint, but the connected Railway workspace currently rejects new project creation because its trial has expired and requires a plan selection.

This is an infrastructure/account blocker, not a CASE-002 code blocker.

## Required external bindings

- public HTTPS n8n endpoint running the pinned runtime target;
- Kapso project/test account;
- connected WhatsApp test number;
- Kapso API key stored outside Git;
- Kapso webhook secret stored outside Git;
- internal control-plane test endpoint/auth;
- test Evidence storage target for the media round-trip.

## Test A — signed inbound text

Evidence to capture:

- Kapso webhook ID/config reference;
- webhook event = `whatsapp.message.received`;
- payload version = `v2`;
- buffering = disabled;
- HTTP delivery status;
- normalized `providerPhoneNumberId`;
- normalized `providerEventId`;
- normalized `providerMessageId`;
- normalized `threadId`;
- logical idempotency key;
- proof that a replay of the same logical message does not duplicate downstream work.

Result: **PENDING**

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

Therefore the remaining Level 2 work is live infrastructure/provider binding and evidence capture, not redesign of the use case.
