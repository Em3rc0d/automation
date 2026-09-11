# MK0 Closure Ledger

Status: **CLOSED — documentation/architecture scope**
Date: 2026-09-11

MK0 closes decisions required to begin implementation. It does **not** certify runtime workflows or the MK1 product.

| Closure node | Status | Evidence |
|---|---|---|
| Product thesis / client-operator boundary / non-goals | CLOSED | `brainstorming/PRODUCT-THESIS.md`, `README.md`, ADR-0001 |
| Common PyME capability coverage | CLOSED | `workflows/SMB-CAPABILITY-LIBRARY.md`, `certification/COVERAGE-MATRIX.md`, mining batches 001–008 |
| Operator/client surfaces | CLOSED | `design/PRODUCT-SURFACES.md` |
| Roles and permissions | CLOSED | `design/ROLES-PERMISSIONS.md` |
| Control-plane architecture | CLOSED | `architecture/ARCHITECTURE-MK1.md`, ADR-0006 |
| Domain contracts v1 | CLOSED | `architecture/DOMAIN-CONTRACTS.md` |
| Connector abstraction | CLOSED | `architecture/CONNECTOR-CONTRACT.md`, `workflows/CONNECTOR-MATRIX.md` |
| Initial execution engine decision | CLOSED-CONDITIONAL | ADR-0002 + `licensing/LICENSE-MATRIX.md`; n8n use remains conditional on compliant commercial licensing/deployment |
| Shared-table tenancy / RLS design | CLOSED | ADR-0003, `security/THREAT-MODEL.md`, `design/ROLES-PERMISSIONS.md` |
| Secrets / OAuth lifecycle | CLOSED | ADR-0004, `security/CONNECTOR-WEBHOOK-SECURITY.md` |
| Execution/event/idempotency model | CLOSED | `architecture/DOMAIN-CONTRACTS.md`, `docs/WORKFLOW-TESTING-STANDARD.md` |
| ProcessRecord / BusinessAction semantics | CLOSED | `architecture/DOMAIN-CONTRACTS.md` |
| Savings Engine v1 | CLOSED | `architecture/SAVINGS-ENGINE.md`, ADR-0005 |
| Security threat pass | CLOSED-DESIGN | `security/THREAT-MODEL.md`, connector/webhook, PII/logging, backup/restore, incident runbook |
| License/provenance policy | CLOSED | `licensing/LICENSE-MATRIX.md`, quarry `registry.yaml`, no-pass policy |
| Workflow mining pipeline | CLOSED-AS-PROCESS | quarry stages + manifests + bulk indexer; mining itself intentionally remains continuous |
| Delivery discovery/onboarding | CLOSED | `commercial/AUTOMATION-DISCOVERY.md`, `docs/CLIENT-ONBOARDING-CHECKLIST.md` |
| Workflow quality/testing standard | CLOSED | `docs/WORKFLOW-TESTING-STANDARD.md`, quarry TESTED/APPROVED gates |
| Production-readiness standard | CLOSED | `docs/PRODUCTION-READINESS-CHECKLIST.md` |
| MK1 scope / DoD / stop rule | CLOSED | `mk1/README.md` |
| Critical OPEN design decisions | NONE KNOWN | repository certification validator + this review |

## Explicit next-level gates

These are **not MK0 blockers** and must not be represented as completed:

```text
W1 BASELINE_LIBRARY_CERTIFIED
- at least one hardened/tested/approved workflow package
- real test evidence
- no unresolved license/provenance blocker for that artifact

P1 PILOT_PRODUCT_CERTIFIED
- tenant/auth/RLS implementation
- real connector
- two active automations
- execution telemetry/incidents
- client ProcessRecord + Savings views
- restore/rollback + incident drill
```

## Closure decision

`MK0 = CLOSED` for product/knowledge/architecture/design governance.

Implementation may begin without reopening frozen decisions unless new evidence creates an ADR-worthy change. Continuous mining is allowed and required, but new findings enter through the quarry and do not silently mutate certified contracts.
