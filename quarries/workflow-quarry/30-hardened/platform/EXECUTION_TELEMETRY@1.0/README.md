# EXECUTION_TELEMETRY@1.0

Stage: **HARDENED CANDIDATE — NOT APPROVED_BASELINE**

## Purpose

Reusable n8n subworkflow that receives one execution event from a caller, validates/normalizes the platform contract and forwards it to the internal control-plane ingestion endpoint.

## Why this exists

Every business automation must emit consistent telemetry without reimplementing event formatting, idempotency headers and retry behavior inside every client workflow.

## Input

Required:

```text
tenantId
automationInstanceId
eventType
occurredAt
traceId
```

Optional:

```text
runId
engine
status
metrics
metadata
idempotencyKey
```

Example:

```json
{
  "tenantId": "tenant_demo",
  "automationInstanceId": "automation_demo",
  "eventType": "COMPLETED",
  "occurredAt": "2026-09-11T17:00:00.000Z",
  "traceId": "trace_demo_001",
  "runId": "run_demo_001",
  "status": "completed",
  "metrics": {
    "eligibleUnits": 1,
    "automatedUnits": 1,
    "exceptionMinutes": 0,
    "oversightMinutes": 0.5,
    "variableCost": 0.01
  }
}
```

## Configuration

Runtime environment:

```text
AUTOMATION_CONTROL_PLANE_URL=https://<internal-control-plane>
```

Attach an operator-managed n8n `HTTP Header Auth` credential to `Post to Control Plane`.

No token or secret is stored in `workflow.json`, `manifest.yaml`, fixtures or README.

## Side effect

```text
POST /internal/execution-events
Idempotency-Key: <stable key>
X-Automation-Schema-Version: 1.0
```

The control-plane API owns durable idempotency enforcement. A repeated request with the same key must not create a duplicate logical event.

## Retry behavior

The HTTP node retries at most 3 times with a 1000 ms interval. Retrying is safe only if the receiving API enforces the idempotency key.

## Failure behavior

Missing required fields fail before the network side effect.

After provider/control-plane retry exhaustion, this subworkflow fails and the parent orchestration must project the failure through `ERROR_TO_INCIDENT@1.0` or its orchestration equivalent.

## Security

- tenant ID is required;
- no embedded credentials;
- no client-specific IDs;
- operational metadata must not contain raw secrets;
- PII should not be placed in telemetry metadata unless a documented use case and policy allow it;
- internal endpoint must use TLS outside isolated local test environments.

## Rollback / disable

A caller can temporarily stop using this subworkflow and keep business execution alive only if the automation's production-readiness policy explicitly allows telemetry degradation. Otherwise telemetry failure should degrade/fail the automation according to its contract.

## Promotion gate

This package remains in `30-hardened` until:

1. imported into a pinned n8n runtime;
2. valid fixture succeeds;
3. malformed fixture fails before side effect;
4. duplicate fixture proves receiver idempotency;
5. retry behavior is observed;
6. secret scan passes;
7. `evidence/TEST-REPORT.md` records actual evidence.
