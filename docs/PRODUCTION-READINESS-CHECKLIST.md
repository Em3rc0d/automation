# Production Readiness Checklist

Status: **QUALITY / RELEASE AUTHORITY**
Updated: 2026-09-11

A client automation is not production-ready until the relevant checks pass.

## Scope and ownership
- [ ] owner, tenant, template/version and connectors identified;
- [ ] business acceptance criteria signed off;
- [ ] system(s) of record explicit;
- [ ] rollback/pause owner explicit;
- [ ] support/escalation contact explicit.

## Security
- [ ] tenant isolation verified;
- [ ] RLS/authorization tests pass;
- [ ] no secrets in Git/workflow/config/logs;
- [ ] webhook auth/replay controls pass;
- [ ] OAuth scopes are least privilege;
- [ ] production credentials are tenant-scoped;
- [ ] customer PII logging is minimized/redacted;
- [ ] high-impact actions have approval policy.

## Reliability
- [ ] idempotency verified;
- [ ] retry classes documented/tested;
- [ ] timeout behavior bounded;
- [ ] DLQ/exception path exists where needed;
- [ ] provider rate-limit behavior known;
- [ ] no infinite retry/loop path;
- [ ] incidents are generated for actionable failures;
- [ ] pause/disable path tested.

## Data/integrity
- [ ] validation before external writes;
- [ ] duplicate detection where business semantics require it;
- [ ] monetary arithmetic deterministic when relevant;
- [ ] AI/OCR outputs schema-validated;
- [ ] source/provider IDs retained for reconciliation;
- [ ] archive/storage path is tenant scoped.

## Observability
- [ ] trace ID throughout run;
- [ ] execution status/latency/error code captured;
- [ ] provider request/event IDs captured when useful;
- [ ] connector health visible;
- [ ] alert ownership known;
- [ ] customer-safe status exposed separately from technical details.

## Savings/value
- [ ] baseline documented and approved;
- [ ] confidence visible;
- [ ] duplicate/retry double counting prevented;
- [ ] exception/oversight time subtracts correctly;
- [ ] variable cost captured or explicitly unavailable;
- [ ] portal wording distinguishes capacity from cash savings.

## Operations
- [ ] backup/restore posture documented;
- [ ] restore/rollback does not replay side effects;
- [ ] incident runbook available;
- [ ] deployment SHA/version recorded;
- [ ] first-run supervised where risk warrants;
- [ ] customer received operating/approval guidance.

## Release decision

Allowed states:

```text
READY
READY_WITH_DOCUMENTED_LIMITATIONS
BLOCKED
```

A blocked critical security, tenant-isolation, secret, idempotency or uncontrolled-side-effect issue cannot be waived for production convenience.
