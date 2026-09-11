# MK0 — Closure Before Build

Status: **CLOSED — K0 knowledge/architecture scope**
Closed: 2026-09-11
Evidence: `mk0/CLOSURE-LEDGER.md`

MK0 exists to prevent the project from becoming infinite.

## Objective

Close every decision that would otherwise cause architectural churn during implementation.

## Required closure nodes

### Product
- product thesis
- ICP hypothesis
- initial offers
- client/operator boundary
- explicit non-goals

### Architecture
- monorepo shape
- Next.js single-app decision
- Postgres/Supabase control plane
- n8n role and exit strategy
- worker role
- internal API boundary

### Domain model
- Tenant
- Membership
- AutomationTemplate
- AutomationInstance
- ExecutionRun/Event
- ProcessRecord
- BusinessAction
- ApprovalRequest
- ConnectorAccount
- Incident
- SavingsBaseline/Event
- AuditEvent

### Tenancy
- shared tables + tenant_id
- RLS policies
- operator privileged path
- negative isolation tests specified for MK1

### Secrets/connectors
- SecretStore contract
- OAuth lifecycle
- minimum scopes
- healthchecks
- reconnect/disconnect

### Execution contracts
- event schema/versioning
- idempotency
- trace IDs
- incident mapping
- provider errors

### Savings Engine
- baseline methodology
- confidence levels
- capacity vs cash semantics
- cost model
- historical baseline versioning

### Security
- threat model
- PII/logging policy
- backups/restore
- incident runbooks
- access controls

### Licensing
- n8n commercial use decision/gate
- dependency license matrix
- source/provenance strategy

## Mandatory ADRs before MK1

- ADR-0001: platform scope and control-plane principle — ACCEPTED
- ADR-0002: n8n as initial engine + exit strategy — ACCEPTED / commercial-license conditional
- ADR-0003: shared-table tenancy + RLS — ACCEPTED
- ADR-0004: secrets strategy — ACCEPTED
- ADR-0005: Savings Engine methodology — ACCEPTED
- ADR-0006: monolith-first deployment — ACCEPTED

## Definition of Done

```text
[x] what we build is frozen for MK1
[x] what we do NOT build is frozen
[x] data/domain contracts v1 accepted
[x] tenancy design closed; runtime isolation tests specified for MK1
[x] secrets strategy accepted
[x] execution/event contract v1 accepted
[x] ProcessRecord semantics accepted
[x] Savings Engine v1 accepted
[x] security design threat pass complete
[x] n8n licensing gate documented
[x] source/license registry exists
[x] MK1 backlog and DoD accepted
[x] no critical OPEN documentation/architecture decision remains
```

## Hard scope freeze

MK0/MK1 do NOT add:

```text
workflow builder
marketplace
billing engine
mobile app
ERP
microservices
Kubernetes
Kafka
generic AI-agent platform
multi-region
custom BI builder
white-label n8n
```

A new feature can enter MK1 only if:
1. a real pilot cannot complete without it;
2. both partners agree;
3. the trade-off is documented;
4. an existing scope item is removed or timeline is explicitly re-baselined.

## Exit condition

MK0 closes when the graph has no unresolved critical product/architecture/design nodes. That condition is met for the K0 snapshot documented in `mk0/CLOSURE-LEDGER.md`.

This closure does **not** certify runtime baselines (W1) or the pilot product (P1); those require actual workflow/test/deployment evidence under `certification/CRITERIA.md`.
