# ADR-0007 — Pre-revenue Zero Fixed Cost and Shared Runtime

Status: Accepted  
Date: 2026-09-24

## Context

The project does not yet have certified recurring revenue. Paying persistent production infrastructure before a customer funds it creates the wrong unit economics and can make low-ticket PyME automation unprofitable.

The product must remain cheap enough for the customer while preserving healthy margin for the operator.

## Decision

Until a paid pilot/customer funds production, the target recurring production infrastructure cost is approximately **S/0**.

Development and demonstration use:
- local containers;
- local n8n when useful;
- local PostgreSQL/Supabase tooling;
- fixtures and mocks;
- GitHub CI within available limits;
- client-owned sandbox/provider accounts when explicitly authorized.

Production defaults:
- shared multi-tenant control plane;
- shared metered execution runtime;
- no always-on runtime dedicated to a tenant;
- no database/project/server per tenant by default;
- provider/API/AI/OCR consumption is client-owned where practical or explicitly metered and contractually separated;
- dedicated tenant infrastructure requires a security, compliance, scale or economics justification.

## Runtime selection

Choose the cheapest profile that still satisfies correctness:

```text
function
→ short event-driven work

scheduled
→ periodic checks/reminders

durable
→ retries/waits across time

human_loop
→ explicit human approval/review

heavy
→ OCR/batch/compute; separately metered
```

A runtime/vendor is an implementation detail behind the AutomationEngine/worker contract.

## n8n consequence

n8n remains allowed for:
- local workflow design;
- connector exploration;
- prototyping;
- factory certification;
- selected production cases when economics and licensing justify it.

n8n is no longer the mandatory default production runtime for every client installation.

## Commercial activation gate

Do not activate new recurring production infrastructure merely to be “ready”.

Preferred sequence:

```text
local proof
→ demo
→ discovery + SavingsBaseline
→ signed/paid pilot
→ minimum required production infrastructure
→ acceptance
→ recurring operation
```

## Consequences

Positive:
- lower pre-revenue burn;
- lower marginal cost per customer;
- easier low-ticket offers;
- less operational sprawl;
- runtime can scale with actual demand.

Trade-offs:
- more code-first implementations;
- runtime portability must be maintained;
- provider-specific conveniences may require adapters;
- metering/cost attribution becomes a platform requirement.

## Guardrail

Infrastructure simplicity must not reduce quality. Tenant isolation, idempotency, retries, exception handling, audit, telemetry, secrets and rollback remain required.
