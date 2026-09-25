# Runtime Profile — `zero-deps-node-v1`

Status: **FACTORY-CERTIFIED RUNTIME PROFILE — WORKFLOWS STILL REQUIRE INDIVIDUAL PROMOTION**

Purpose: prove customer-facing Savings Workflows can execute locally and in CI without n8n, Docker services, paid hosting or third-party libraries.

## Boundary

- Node.js >= 20;
- ECMAScript modules;
- Node standard library only;
- no `npm install` required;
- no network required for tests/demo;
- in-memory control-plane/idempotency/adapters for reference evidence;
- provider credentials absent;
- deterministic fixtures and built-in `node:test`.

## Runtime invariants

- tenant ID required on every execution;
- idempotency claim before business side effects;
- side-effect adapter receives a deterministic idempotency key;
- bounded retries only for explicitly retryable errors;
- failed execution creates an incident and no SavingsEvent;
- successful/attention executions record ProcessRecord when returned;
- SavingsEvent records eligible/automated units, exception/oversight minutes and variable cost;
- technical details are represented by trace reference, not exposed as customer-safe text;
- failed runs release execution idempotency so a repaired dependency can be replayed safely, relying on side-effect idempotency to prevent duplication.

## Factory certification

`zero-deps-node-v1` is independently factory-certified. It does not inherit the n8n profile seal.

Evidence:
- exact main evidence SHA: `8475fcd95817098c59cd1088b543e4881bd3fe38`;
- Baseline Factory Validation run: `36087356818`;
- factory job: `107922114438` — SUCCESS;
- profile job: `107922514846` — SUCCESS;
- Node: `20.19.5`;
- suite: **44 tests / 44 pass / 0 fail**;
- hardening-readiness validator: PASS;
- runtime smoke: PASS;
- certificate: `certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md`.

This certifies the execution substrate/package boundary. It does **not** automatically promote the 12 workflows beyond their current lifecycle stage.


## Current reference coverage

`zero-deps-node-v1` now executes all **12/12 W-SAVINGS-P0 reference workflows** across nine business domains using the same kernel.

The reference surface exercises:
- event/function execution;
- scheduled polling;
- persisted durable sequence state;
- table/message/calendar/storage adapters;
- bounded retries;
- provider-side idempotency;
- ProcessRecord / Incident / SavingsEvent telemetry;
- missing-data exception accounting;
- deterministic rule evaluation;
- variable-cost attribution.

The reference coverage is now backed by the explicit factory profile certificate; individual workflow TESTED/APPROVED evidence remains separate.
