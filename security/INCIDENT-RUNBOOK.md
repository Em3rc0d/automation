# Incident Response Runbook

Status: **MK0 AUTHORITY**
Updated: 2026-09-11

## Severity

- `INFO` — no customer impact; observation only.
- `WARNING` — degraded capability or bounded retry state.
- `ERROR` — one automation/client operation failed or requires intervention.
- `CRITICAL` — suspected cross-tenant exposure, secret compromise, uncontrolled side effects, widespread outage or integrity loss.

## First response

```text
DETECT
→ stop/contain unsafe side effects
→ identify affected tenant(s)/automation/version/provider
→ preserve evidence
→ rotate/revoke credentials if compromise is plausible
→ assess customer impact
→ remediate/reconcile
→ verify recovery
→ close with root cause + prevention
```

## Immediate containment triggers

Pause an automation or connector when:
- duplicate financial/customer-facing side effects are occurring;
- provider authentication is compromised;
- tenant isolation is uncertain;
- malformed AI/provider output can produce unsafe writes;
- retry storms/rate limits risk compounding damage;
- document/message routing may cross tenants.

## Evidence

Preserve `traceId`, `executionRunId`, automation/template version, provider event IDs, timestamps, error codes, deployment SHA and relevant redacted logs. Never solve an incident by deleting evidence.

## Customer communication

Customer-safe messages state impact, affected process/time window, current containment and required customer action. Do not expose secrets, internal exploit details or another tenant's data.

## Reconciliation

After recovery compare internal records against provider/source-of-truth IDs. Missing operations may be replayed only with idempotency evidence or explicit operator approval; ambiguous operations are not blindly retried.

## Closure criteria

- unsafe behavior stopped;
- affected tenants identified;
- data/side effects reconciled;
- credentials rotated/revoked when needed;
- automation health restored or intentionally disabled;
- root cause documented;
- regression test or preventive control added;
- `Incident` resolved and `AuditEvent` emitted.
