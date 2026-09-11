# Quarry — OSS / Open-Code Baselines

Research date: 2026-09-11

Goal: identify codebases we can reuse, integrate, study or deliberately avoid so we deliver client automations faster.

## Decision matrix

| Project | Category | Priority | License signal | Adopt / Study | Exact reason |
|---|---|---:|---|---|---|
| n8n | workflow engine | P0* | Sustainable Use | Adopt internally with legal gate | Best initial delivery speed and connector breadth |
| Node-RED | flow engine | P1 | Apache-2.0 | Study + fallback | Permissive, mature event-flow runtime |
| Trigger.dev | durable TS jobs | P1 | Apache-2.0 | Adopt when code-first jobs emerge | Long-running/background TypeScript jobs |
| Temporal | durable workflow | P2 | MIT | Study, not MK1 | Strong guarantees but high ops/cognitive cost |
| Kestra | orchestration | P2 | Apache-2.0 | Study | Event/data-heavy orchestration patterns |
| Activepieces | automation | P1/P2 | verify LICENSE | Study | Connector/piece ecosystem and alternative UX |
| Windmill | code-first automation | P2 | mixed surface | Study | Scripts/jobs/workflows patterns |
| Automatisch | Zapier-like | P2 | verify LICENSE | Study | Connector and automation product patterns |
| Huginn | event agents | P2 | verify HEAD | Study | Historical event-agent architecture |
| Supabase | data/control plane | P0 | Apache-2.0 repo main | Adopt | Postgres/Auth/Storage/RLS |
| pgvector | vector search | P1 later | PostgreSQL-style | Adopt only if RAG appears | Avoid extra vector DB early |
| Langfuse | LLM observability | P2 | verify current LICENSE | Study/adopt later | LLM traces, costs, evals |
| Docling | document parsing | P1 | MIT | Adopt when needed | Rich document conversion |
| PaddleOCR | OCR | P1 | Apache-2.0 | Adopt when needed | Multilingual OCR/layout |
| Tesseract | OCR | P1/P2 | Apache-2.0 | Fallback | Mature local OCR |
| Twenty | CRM | P2 | verify LICENSE | Study/integrate | CRM model/UI/integration patterns |
| Chatwoot | support | P2 | verify edition | Study/integrate | Omnichannel/ticketing patterns |

`P0*` for n8n means technically preferred but commercially gated by license review.

## What to borrow from each

### n8n
Borrow:
- connector catalog and auth patterns;
- webhook/cron/trigger model;
- visual workflow iteration speed;
- error workflows;
- import/export workflow JSON;
- queue mode growth path;
- Prometheus runtime metrics.

Do not:
- make n8n our system of record;
- expose editor to customers;
- hard-code product semantics to node IDs;
- white-label/resell without confirming license compatibility.

### Node-RED
Borrow:
- event-driven flow design;
- simple node contracts;
- edge/local runtime ideas;
- Apache-licensed implementation patterns where directly useful.

Potential fallback if n8n licensing conflicts with the business model.

### Trigger.dev
Borrow:
- job-first TypeScript developer experience;
- durable retries/background jobs;
- task observability;
- code-centric workflow semantics.

Use when a workflow becomes awkward as visual nodes but does not justify Temporal.

### Temporal
Borrow concepts:
- durable execution;
- workflow/activity separation;
- deterministic orchestration;
- retry semantics;
- long-lived process thinking.

Do not deploy in MK1.

### Supabase/Postgres
Borrow/adopt:
- RLS tenant isolation;
- Auth integration;
- Postgres as domain source of truth;
- Storage only for required artifacts;
- Realtime only when UI needs it.

### Docling / PaddleOCR / Tesseract
Build a future detached Document Processing service:

```text
input file
→ type detection
→ digital text extraction if possible
→ OCR only if necessary
→ structure/table extraction
→ schema validation
→ confidence
→ ProcessRecord
→ optional human review
```

Do not force every document through an LLM if deterministic extraction is enough.

## Architecture pattern learned from the ecosystem

Use a **control plane / execution plane split**.

Control plane owns:
- tenant
- automation instance
- configuration
- connector references
- runs/events
- incidents
- approvals
- process data
- savings

Execution plane owns:
- triggers
- temporary execution context
- provider calls
- retries
- workflow-specific transformation

This allows engines to change later.

## Anti-patterns observed / explicitly rejected

- dynamic DB table per tenant;
- credentials embedded in exported workflows;
- one global workflow with mixed customer credentials;
- saving every provider payload forever;
- LLM decides and executes high-impact side effect in one unvalidated step;
- single giant workflow containing all customer-specific branches;
- no idempotency because “n8n handles it”;
- customer portal mirrors technical workflow graph;
- automation savings inferred only from run count.

## Adoption protocol

Before introducing a third-party project:

1. Record exact repo URL and inspected commit/tag.
2. Read LICENSE at that revision.
3. Identify commercial/distribution obligations.
4. Identify security/maintenance status.
5. Write why existing stack cannot solve the requirement.
6. Define exit strategy.
7. Add an ADR.

No dependency enters core architecture merely because it is popular.
