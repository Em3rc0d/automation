# Domain Contracts v1

These contracts are owned by our platform, not by n8n or any provider.

## 1. AutomationTemplate

Reusable automation definition.

```ts
export interface AutomationTemplate {
  id: string;
  key: string;
  version: number;
  name: string;
  category: "lead" | "quote" | "invoice" | "email" | "appointment" | "support" | "onboarding" | "reporting" | "other";
  engine: "n8n" | "worker" | "triggerdev" | "temporal";
  requiredConnectorTypes: string[];
  configSchemaVersion: number;
  status: "draft" | "active" | "deprecated";
}
```

## 2. AutomationInstance

Tenant-specific installation of a template.

```ts
export interface AutomationInstance {
  id: string;
  tenantId: string;
  templateId: string;
  templateVersion: number;
  status: "draft" | "active" | "paused" | "degraded" | "disabled";
  engineReference: string;
  config: Record<string, unknown>;
  connectorAccountIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

## 3. ExecutionRun

One logical run.

```ts
export interface ExecutionRun {
  id: string;
  tenantId: string;
  automationInstanceId: string;
  engine: string;
  engineExecutionId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  startedAt: string;
  finishedAt?: string;
  traceId?: string;
}
```

## 4. ExecutionEvent

Technical fact about a run.

```ts
export interface ExecutionEvent {
  schemaVersion: 1;
  idempotencyKey: string;
  tenantId: string;
  automationInstanceId: string;
  executionRunId?: string;
  eventType:
    | "execution.started"
    | "execution.completed"
    | "execution.failed";
  occurredAt: string;
  engine: {
    name: "n8n" | "worker" | "triggerdev" | "temporal";
    executionId: string;
  };
  metrics: {
    eligibleUnits: number;
    automatedUnits: number;
    exceptionMinutes: number;
    oversightMinutes: number;
    variableCostPen: number;
  };
  traceId?: string;
}
```

## 5. ProcessRecord

Normalized business fact visible in the platform.

```ts
export interface ProcessRecord {
  id: string;
  tenantId: string;
  automationInstanceId: string;

  entityType:
    | "lead"
    | "quote"
    | "invoice"
    | "appointment"
    | "ticket"
    | "document"
    | "customer"
    | "task"
    | string;

  entityId: string;

  source: {
    system: string;
    externalId?: string;
  };

  status: string;
  occurredAt: string;
  updatedAt: string;

  summary: Record<string, unknown>;
  attributes: Record<string, unknown>;

  monetaryValue?: number;
  currency?: string;

  requiresAttention: boolean;
}
```

Why generic initially: we need to support many Pyme process types without accidentally building an ERP. Promote a domain to dedicated tables only after repeated client evidence justifies it.

## 6. BusinessAction

A proposed or executed side effect.

```ts
export interface BusinessAction {
  id: string;
  tenantId: string;
  automationInstanceId: string;
  processRecordId?: string;

  type:
    | "send_email"
    | "send_whatsapp"
    | "create_quote"
    | "approve_discount"
    | "assign_lead"
    | "create_task"
    | "request_payment"
    | "reschedule_appointment"
    | "escalate_ticket"
    | "generate_document"
    | string;

  status:
    | "proposed"
    | "awaiting_approval"
    | "approved"
    | "executing"
    | "completed"
    | "rejected"
    | "failed";

  payload: Record<string, unknown>;
  proposedBy: "automation" | "ai" | "operator" | "client";
  requiresApproval: boolean;
  createdAt: string;
  executedAt?: string;
}
```

## 7. ApprovalRequest

```ts
export interface ApprovalRequest {
  id: string;
  tenantId: string;
  automationInstanceId: string;
  businessActionId: string;
  status: "pending" | "approved" | "rejected" | "expired";
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
}
```

## 8. ConnectorAccount

Metadata only; secret material lives behind `secretReference`.

```ts
export interface ConnectorAccount {
  id: string;
  tenantId: string;
  provider: string;
  externalAccountId?: string;
  accountLabel?: string;
  scopes: string[];
  secretReference: string;
  status: "connected" | "degraded" | "expired" | "disconnected";
  expiresAt?: string;
  lastHealthcheckAt?: string;
}
```

## 9. SavingsBaseline

```ts
export interface SavingsBaseline {
  id: string;
  tenantId: string;
  automationInstanceId: string;
  currency: "PEN" | string;
  manualMinutesPerUnit: number;
  loadedHourlyCost: number;
  baselineSampleSize?: number;
  baselineMethod: "time_study" | "system_data" | "client_declared" | "mixed";
  confidence: "low" | "medium" | "high";
  validFrom: string;
  validTo?: string;
  assumptions: Record<string, unknown>;
}
```

## 10. SavingsEvent

```ts
export interface SavingsEvent {
  id: string;
  tenantId: string;
  automationInstanceId: string;
  executionRunId?: string;
  occurredAt: string;
  eligibleUnits: number;
  automatedUnits: number;
  exceptionMinutes: number;
  oversightMinutes: number;
  variableCost: number;
}
```

## 11. Incident

```ts
export interface Incident {
  id: string;
  tenantId: string;
  automationInstanceId: string;
  executionRunId?: string;
  severity: "info" | "warning" | "error" | "critical";
  status: "open" | "acknowledged" | "resolved";
  code: string;
  customerSafeMessage: string;
  technicalDetailsRef?: string;
  traceId?: string;
  openedAt: string;
  resolvedAt?: string;
}
```

## 12. AuditEvent

Every privileged mutation, connector lifecycle action and approval decision must be auditable.

```ts
export interface AuditEvent {
  id: string;
  tenantId?: string;
  actorType: "operator" | "client" | "system";
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
}
```

## Cross-cutting invariants

- `tenantId` is always validated against the referenced instance/entity.
- Events and side effects require idempotency.
- Technical error payloads are not directly customer-visible.
- Secrets never appear in these contracts.
- AI output is schema-validated before business rules.
- High-risk actions require explicit policy and usually human approval.
- Contract versions are explicit and migration-compatible.
