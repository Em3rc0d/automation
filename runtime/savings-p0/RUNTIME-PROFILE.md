# Runtime Profile — `zero-deps-node-v1`

Status: **W-SAVINGS-P0 REFERENCE PROFILE — NOT YET FACTORY-CERTIFIED**

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

## Certification consequence

This profile does not inherit `n8n-base-js-v1` certification. W-SAVINGS-P0 CI is reference evidence only. A future factory seal must explicitly certify this profile before any package is promoted to `APPROVED_BASELINE` on it.
