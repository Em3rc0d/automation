# Architecture MK1

## Architectural rule

The platform is the source of truth. Execution runtime is interchangeable and selected by workload, quality requirements and cost.

```text
Client / Operator
      ↓
Next.js Web + API
      ↓
PostgreSQL / Supabase
      ↓
AutomationEngine / RuntimeProfile abstraction
      ↓
shared function / scheduler / durable worker / heavy worker / n8n when justified
      ↓
Gmail / WhatsApp / CRM / Drive / APIs
      ↓
Execution events + process records
      ↓
Platform API
      ↓
Savings Engine + Portal
```

## Recommended MK1 stack

- TypeScript
- Next.js single app with `(ops)` and `(portal)` route groups
- PostgreSQL/Supabase
- Supabase Auth
- RLS for tenant isolation
- Supabase Storage only where needed
- shared, runtime-neutral execution by workload profile
- local n8n for design/factory and optional production use when economics/licensing justify it
- Node.js/TypeScript worker/function implementations for productized Savings Workflows
- OpenAI SDK only where semantic extraction/classification adds value
- web hosting selected at activation time; pre-revenue development remains local/free where practical
- persistent Railway/VPS/runtime is **not** a pre-revenue default and is activated only when a paid workload justifies it
- Zod + OpenAPI contracts
- Vitest + Playwright

## Explicitly excluded from MK1

- Kafka
- Kubernetes
- Temporal
- microservices
- Redis unless metrics prove queue mode is needed
- workflow builder
- customer-facing n8n
- generic agent platform

## Runtime economics and profiles

Pre-revenue rule: fixed production infrastructure target is approximately **S/0**. Use local containers, fixtures and mocks until a paid pilot funds the minimum production runtime.

Production defaults to shared multi-tenant execution; a tenant should not receive an always-on server merely because a workflow is installed.

Runtime profiles:

```text
function    short event/request-driven work
scheduled   periodic checks/reminders
 durable    waiting/retries across minutes/days
human_loop  explicit approval/review
heavy       OCR/batch/compute; separately metered
```

Provider/runtime implementation remains replaceable. Runtime profile is business/operational metadata; engine vendor is an implementation detail.

See ADR-0007 and `workflows/SAVINGS-WORKFLOW-STANDARD.md`.

## Core entities

```text
Tenant
User
Membership
AutomationTemplate
SavingsWorkflowDefinition
PluginInstallation
AutomationInstance
AutomationVersion
ConnectorAccount
CredentialReference
ExecutionRun
ExecutionEvent
ProcessRecord
BusinessAction
ApprovalRequest
Incident
AuditEvent
SavingsBaseline
SavingsEvent
```

## AutomationTemplate vs AutomationInstance

`AutomationTemplate` describes reusable behavior.

`AutomationInstance` means:

> template X version Y is installed for tenant Z with this configuration and these connectors.

Example:

```json
{
  "tenantId": "tenant-acme",
  "templateKey": "lead-followup",
  "templateVersion": 3,
  "runtimeProfile": "function",
  "engine": "worker",
  "engineReference": "shared-worker:lead-followup-v3",
  "status": "active",
  "config": {
    "followUpAfterHours": 24,
    "maxAttempts": 3,
    "businessTimezone": "America/Lima"
  },
  "connectors": ["whatsapp-main", "crm-main"]
}
```

## Engine abstraction

```ts
export type RuntimeProfile =
  | "function"
  | "scheduled"
  | "durable"
  | "human_loop"
  | "heavy";

export type EngineName =
  | "worker"
  | "n8n"
  | "triggerdev"
  | "temporal"
  | "other";

export interface AutomationEngine {
  execute(input: {
    tenantId: string;
    automationInstanceId: string;
    runtimeProfile: RuntimeProfile;
    payload: unknown;
    idempotencyKey: string;
  }): Promise<{
    engine: EngineName;
    engineExecutionId: string;
  }>;

  cancel(engineExecutionId: string): Promise<void>;

  healthCheck(): Promise<{
    ok: boolean;
    latencyMs?: number;
  }>;
}
```

Application/domain code must not depend on n8n node internals.

## Tenancy

Use shared tables with `tenant_id`, not schemas/tables dynamically generated per tenant.

Every customer-visible table must have RLS. `service_role` remains server-only.

Cross-tenant operator actions happen through privileged backend endpoints and are audited.

## Secrets

Normal tables store only references:

```text
connector_accounts
- id
- tenant_id
- provider
- external_account_id
- secret_reference
- scopes
- status
- expires_at
- last_healthcheck_at
```

Secret storage is behind an abstraction:

```ts
export interface SecretStore {
  put(namespace: string, plaintext: string): Promise<string>;
  get(reference: string): Promise<string>;
  delete(reference: string): Promise<void>;
}
```

## Internal API minimum

```text
POST /v1/internal/execution-events
POST /v1/internal/process-records
POST /v1/internal/incidents
GET  /v1/portal/dashboard
GET  /v1/portal/process-records
POST /v1/ops/tenants
POST /v1/ops/automation-instances
POST /v1/connectors/:provider/authorize
POST /v1/approvals/:id/decision
```

All internal engine endpoints require auth, schema validation, tenant validation, idempotency, rate limiting and auditability.
