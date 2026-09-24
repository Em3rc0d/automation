# ADR-0002 — n8n as Initial Automation Engine

Status: Superseded as mandatory production default by ADR-0007; retained for local/factory/selected production use
Date: 2026-09-11

## Context

We need maximum delivery speed for a two-person team while keeping the product independent from one engine.

## Decision

Use self-hosted n8n as the initial internal automation engine for MK1, behind our `AutomationEngine` contract.

The product database, tenant model, process records, savings and customer portal do not depend on n8n internals.

## Why

- large connector ecosystem;
- fast visual iteration;
- webhooks/cron/branching/error paths;
- import/export workflows;
- self-hosting;
- growth path through queue mode.

## License gate

n8n core is under Sustainable Use License, not a standard permissive OSS license.

Before selling the production service, document whether our exact use — internal infrastructure powering a managed automation service without exposing/reselling n8n — complies with current terms. Do not white-label or resell n8n capabilities without a separate review.

## Alternatives

- Node-RED — permissive Apache-2.0 fallback.
- Trigger.dev — strong TypeScript jobs for code-first tasks.
- Temporal — durable critical workflows later, not MK1.
- Kestra / Activepieces / Windmill — research alternatives.

## Exit strategy

All executions are initiated through an engine adapter and report to our event contract.

Migration path:

```text
AutomationTemplate
AutomationInstance
      ↓
AutomationEngine
      ↓
[n8n] → [Trigger.dev / worker / Temporal / other]
```

No customer-facing contract should expose n8n workflow/node identifiers as business semantics.

## 2026-09-24 clarification

ADR-0007 supersedes the assumption that every production client should be backed by a persistent self-hosted n8n runtime.

n8n remains useful for local design, connector exploration, Baseline Factory execution and selected production workloads. The default customer installation model is now runtime-neutral, shared/metered and selected by workload economics.

The original independence requirement in this ADR remains in force: customer/domain contracts must not depend on n8n internals.
