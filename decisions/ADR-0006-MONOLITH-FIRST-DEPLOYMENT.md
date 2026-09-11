# ADR-0006 — Monolith-First Deployment

Status: **ACCEPTED**
Date: 2026-09-11

## Context

Two operators must be able to build, understand, deploy and repair the product without creating an infrastructure project larger than the business.

## Decision

MK1 uses a modular monolith control plane plus external workflow/runtime services.

```text
Next.js control plane
├── operator console
├── client portal
├── API/application services
├── domain modules
└── connector orchestration
        │
        ├── PostgreSQL/Supabase
        ├── n8n runtime
        └── small workers/jobs where n8n is inappropriate
```

No microservice boundary is created merely for conceptual purity. A component may be extracted only after measured operational/scaling/security evidence demonstrates that extraction reduces risk or cost.

## Deployment baseline

- web/control plane: Vercel or equivalent;
- Postgres/Auth/Storage: Supabase or managed PostgreSQL stack;
- n8n + durable workers: managed VPS/Railway-equivalent runtime isolated from the browser tier;
- provider credentials never exposed to client-side code;
- environment separation: development / staging / production;
- migrations are versioned and reversible where feasible;
- observability and backup/restore are requirements, not post-launch extras.

## Explicitly rejected for MK1

- Kubernetes;
- Kafka;
- service mesh;
- multi-region active-active;
- event bus introduced without a real throughput/durability requirement;
- one database per microservice;
- generic workflow-builder backend.

## Exit strategy

The platform contracts (`AutomationInstance`, `ExecutionRun/Event`, `ProcessRecord`, `BusinessAction`, connectors and Savings events) must not depend on deployment topology. n8n/workers/providers sit behind adapters so components can later be replaced independently.
