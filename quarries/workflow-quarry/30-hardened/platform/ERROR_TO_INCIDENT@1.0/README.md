# ERROR_TO_INCIDENT@1.0

Stage: **HARDENED CANDIDATE — NOT APPROVED_BASELINE**

## Purpose

Reusable n8n subworkflow that converts one workflow/runtime failure into the platform Incident contract, redacts obvious secret patterns and sends the normalized incident to the internal control plane.

## Required input

```text
tenantId
automationInstanceId
traceId
occurredAt
```

Optional error fields may be supplied either at the top level or under `error`.

## Example

```json
{
  "tenantId": "tenant_demo",
  "automationInstanceId": "automation_demo",
  "traceId": "trace_001",
  "runId": "run_001",
  "occurredAt": "2026-09-11T17:00:00.000Z",
  "severity": "error",
  "provider": "gmail",
  "nodeName": "Fetch Message",
  "error": {
    "code": "PROVIDER_401",
    "message": "Credential expired",
    "retryable": false,
    "category": "auth"
  }
}
```

## Side effect

```text
POST /internal/incidents
Idempotency-Key: <stable incident fingerprint>
```

## Redaction

Before transport the workflow applies defense-in-depth redaction for:

- Bearer-token-shaped substrings;
- common `apiKey=`, `token=`, `password=`, `secret=` assignments;
- oversized individual text fields.

This is not a substitute for safe upstream error shaping. Parent workflows must not intentionally send raw credential objects or unrestricted customer payloads.

## Configuration

```text
AUTOMATION_CONTROL_PLANE_URL=https://<internal-control-plane>
```

Attach an operator-managed HTTP Header Auth credential to `Post Incident to Control Plane`.

## Retry and idempotency

The transport retries up to 3 times. The control plane must enforce the same `Idempotency-Key` so a transient failure cannot produce duplicate incidents.

## Client visibility

Raw technical incident payloads are operator-facing. Client Portal projection must expose only safe abstraction/status fields according to the product contract.

## Promotion gate

Remain in `30-hardened` until pinned-runtime tests demonstrate import, valid incident creation, malformed-input rejection, secret-pattern redaction, duplicate handling, retry behavior and no secret leakage.
