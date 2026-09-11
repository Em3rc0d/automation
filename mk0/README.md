# MK0 — Closure Before Build

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
- negative isolation tests

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
- n8n commercial use decision
- exact dependency license matrix
- repository license/private strategy

## Mandatory ADRs before MK1

- ADR-0001: platform scope and control-plane principle
- ADR-0002: n8n as initial engine + exit strategy
- ADR-0003: shared-table tenancy + RLS
- ADR-0004: secrets strategy
- ADR-0005: Savings Engine methodology
- ADR-0006: monolith-first deployment

## Definition of Done

```text
[ ] what we build is frozen for MK1
[ ] what we do NOT build is frozen
[ ] data/domain contracts v1 accepted
[ ] tenancy proven with tests/design
[ ] secrets strategy accepted
[ ] execution/event contract v1 accepted
[ ] ProcessRecord semantics accepted
[ ] Savings Engine v1 accepted
[ ] security threat pass complete
[ ] n8n licensing decision documented
[ ] source/license registry exists
[ ] MK1 backlog and DoD accepted
[ ] no critical OPEN decision remains
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

MK0 closes when the graph has no unresolved critical nodes. Only then implementation begins.
