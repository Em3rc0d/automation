# Mining Batch 006 — Control Plane, Portals, Durability, Metering, Security & Observability

Date: 2026-09-11
Status: ACTIVE MINING

## Objective

Continue mining beyond n8n workflow JSON. This batch focuses on reusable open-source architecture/code for the platform that will operate customer automations:

```text
Client/Operator Portal
 -> tenancy/authz
 -> automation catalog/instances
 -> durable execution / queues
 -> approvals
 -> webhooks
 -> secrets
 -> events/metering
 -> observability
 -> savings/cost dashboards
```

No source is adopted automatically. License boundaries and product-fit gates remain mandatory.

---

## A. White-label automation portals

### FlowEngine
Repository: https://github.com/FlowEngine-cloud/flowengine

Observed product fit:
- explicitly targets automation agencies using n8n;
- white-label client portal;
- manage instances and invite clients;
- client-scoped workflow/execution views;
- templates;
- embeddable UI/webhook surfaces;
- billing integration.

Priority: **P0 architecture/UI quarry**.

Why important: close analog to our Operator Console + Client Portal thesis. Mine information architecture, data boundaries, n8n API integration and client permission model; do not assume whole-product reuse until license/code review is complete.

### AutoMaestro
Repository: https://github.com/TeoMastro/AutoMaestro

Observed stack/patterns:
- white-label frontend in front of n8n;
- multi-tenant company management;
- ADMIN / MANAGER / CLIENT roles;
- encrypted n8n credentials per company;
- workflow assignment;
- Next.js + Supabase/Postgres + RLS + Auth + Storage;
- webhook-triggered workflow invocation;
- n8n posts logs back to portal;
- template library;
- per-company branding.

Priority: **P0 architecture/code quarry**.

This is one of the closest public baselines found to our target architecture.

---

## B. Durable workflows and human approval

### Trigger.dev
Repository: https://github.com/triggerdotdev/trigger.dev

Observed capabilities:
- TypeScript long-running workflows/tasks;
- queues;
- retries;
- idempotency;
- observability;
- realtime subscriptions;
- human-in-the-loop pause/resume.

Priority: P0 as alternative/companion worker engine.

### Temporal TypeScript samples
Repositories/docs:
- https://github.com/temporalio/samples-typescript
- https://github.com/temporalio/sdk-typescript
- https://github.com/temporalio/documentation

Observed reusable approval pattern:
- pause durable workflow awaiting external signal;
- query current state without mutating;
- approval timeout;
- state survives process restarts/replays.

Priority: P1 initially, P0 if n8n cannot safely cover long-running/high-value approval workflows.

### Windmill
Repository: https://github.com/windmill-labs/windmill
License: AGPLv3; commercial licensing relevant if re-exposed as part of our product.

Observed capabilities:
- scripts -> jobs/webhooks/workflows/UIs;
- self-hosting;
- workflow-as-code;
- named approval steps and approval URLs;
- resources/resource types for integrations.

Decision: P1 architecture quarry, **license caution** before embedding/re-exposing.

---

## C. Usage metering / cost accounting

### OpenMeter
Repository: https://github.com/openmeterio/openmeter

Observed model:
```text
usage event -> meter -> aggregation -> entitlement/pricing/billing
```

Reusable ideas for our platform even if we do not use its billing layer:
- CloudEvents-style event ingestion;
- customer/subject attribution;
- dimensioned usage aggregation;
- idempotent usage events;
- time-window querying.

Potential use:
- automation executions;
- units processed;
- AI/API calls;
- storage;
- external provider costs;
- per-client variable cost.

Priority: **P0 knowledge/code quarry for Metering/Cost Engine**.

### Lago
Repository: https://github.com/getlago/lago
License: AGPL-3.0 for OSS components; inspect boundaries before reuse.

Observed strengths:
- event-based metering;
- customer usage;
- pricing/subscriptions/credits/invoices;
- API-first integration.

Priority: P1. More relevant when our recurring pricing becomes usage-based; useful now for event/idempotency architecture.

---

## D. Secure webhooks

### Standard Webhooks
Repository/spec: https://github.com/standard-webhooks/standard-webhooks
License: Apache-2.0.

Important baseline rules:
- JSON event envelope recommendation;
- message/event ID;
- timestamp;
- signed exact payload bytes;
- HMAC-SHA256 or Ed25519;
- replay-window checks;
- constant-time signature comparison;
- same message ID across delivery retries;
- message ID doubles as idempotency key;
- key rotation through multiple signatures.

Priority: **P0 security baseline** for our own inbound/outbound platform webhooks.

### Svix
Repository: https://github.com/svix/svix-webhooks

Reusable architecture:
- reliable webhook delivery;
- endpoint-specific signing secrets;
- symmetric/asymmetric signature support;
- delivery/retry service patterns.

Priority: P1/P0 depending whether we need to deliver webhooks to customers rather than only consume provider hooks.

---

## E. Queues / asynchronous work

### Graphile Worker
Repository: https://github.com/graphile/worker
License: MIT.

Pattern:
- PostgreSQL-backed job queue;
- background jobs without blocking HTTP;
- good fit with Postgres/Supabase-shaped stack.

### pg-boss
Repository: https://github.com/timgit/pg-boss

Pattern:
- Node.js/Postgres queue;
- reliable async jobs based on Postgres locking semantics.

Decision: both remain candidates for a small MK1/MK2 worker queue before introducing Redis/Temporal-scale infrastructure.

---

## F. Secrets management

### Infisical
Repository: https://github.com/Infisical/infisical
License structure:
- non-EE core: MIT Expat;
- EE directories: enterprise/commercial license;
- third-party content retains upstream licenses.

Observed capabilities:
- secrets management;
- certificates/PKI and privileged access features;
- self-hosting;
- code/repo secret scanning;
- pre-commit leak scanning.

Priority: **P0 secrets architecture quarry**, P1 adoption decision. We may still use provider-specific secret stores initially, but should copy the governance patterns.

---

## G. Authorization / tenant isolation

### OpenFGA
Project: https://github.com/openfga

Observed model:
- relationship-based authorization inspired by Zanzibar;
- fine-grained permissions beyond simple RBAC;
- API/SDK ecosystem.

Decision: P1. MK1 can remain RLS + simple roles; OpenFGA becomes relevant when operator/client/delegate/workflow permissions grow beyond maintainable SQL/RBAC rules.

---

## H. Observability

### OpenTelemetry Collector
Repository: https://github.com/open-telemetry/opentelemetry-collector

Observed value:
- vendor-neutral ingestion/processing/export for traces, metrics and logs;
- avoids coupling telemetry contracts to one backend.

Priority: **P0 observability contract quarry**. We should design trace IDs/spans compatible with OpenTelemetry semantics even if MK1 uses simpler storage.

### Langfuse
Repository: https://github.com/langfuse/langfuse
License structure:
- core: MIT Expat;
- EE directories: commercial/enterprise license.

Observed value for AI automations:
- request/application tracing;
- prompt/model/tool visibility;
- latency;
- token usage;
- cost tracking;
- debugging non-deterministic AI behavior.

Priority: P0 knowledge/adoption candidate whenever an automation includes meaningful LLM logic.

### Prometheus
Repository: https://github.com/prometheus/prometheus
License: Apache-2.0.

Value: service/worker metrics, counters, latency histograms, health monitoring.

### Loki
Repository: https://github.com/grafana/loki
License: AGPL-3.0-only by default with documented Apache-2.0 exceptions for selected folders.

Decision: useful logging architecture reference, but licensing must be respected before product embedding.

---

## I. Control-plane design implications

Mining reinforces these platform primitives:

```text
Tenant
User / Membership / Role
AutomationTemplate
AutomationInstance
ConnectorAccount
ExecutionRun
ExecutionEvent
ProcessRecord
BusinessAction
ApprovalRequest
Incident
AuditEvent
UsageEvent
CostEvent
SavingsEvent
WebhookEndpoint
WebhookDelivery / WebhookReceipt
SecretReference
Trace / Span reference
```

New quarry candidates to formalize later:

```text
USAGE_METER
VARIABLE_COST_METER
SIGNED_WEBHOOK_RECEIVER
SIGNED_WEBHOOK_SENDER
DURABLE_APPROVAL
ASYNC_JOB
AI_TRACE
CONNECTOR_HEALTHCHECK
```

---

## J. Licensing reminders

Do not equate "open source" with unrestricted embedding:
- MIT / Apache-2.0 sources are generally permissive but still require notice/attribution compliance.
- AGPL sources such as Windmill/Lago/Loki may impose source-sharing obligations when modified/network-exposed; commercial licensing may be needed depending on architecture.
- open-core repositories (Activepieces, Infisical, Langfuse) have separate enterprise directories/licenses.

Every copied/adapted code cohort must keep exact path + upstream license/provenance.

---

## Mining rule

Baseline synthesis and implementation work **must not stop discovery/mining**.

```text
Internet mining ---------> quarry grows continuously
         |                         |
         +--> candidate patterns --+
                                   |
                                   v
                             hardening/tests
                                   |
                                   v
                           APPROVED_BASELINE
```

The existence of an approved baseline never means the source quarry is closed.
