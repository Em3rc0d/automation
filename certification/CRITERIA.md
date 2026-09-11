# Repository Certification Criteria

Status: **CERTIFICATION AUTHORITY**
Updated: 2026-09-11

Certification is snapshot-based and bound to a commit SHA. It never means “all future mining is complete”.

## Levels

### K0 — KNOWLEDGE_ARCHITECTURE_CERTIFIED
Certifies that the repository is sufficiently closed to begin implementation without major product/architecture decisions remaining open.

Required:
- product thesis/non-goals;
- 20-family SMB capability coverage map;
- connector abstraction;
- domain contracts;
- six mandatory ADRs;
- tenancy/RLS design;
- secrets/OAuth strategy;
- Savings Engine methodology;
- threat model + connector/webhook + PII/logging + backup/restore + incident runbook;
- license/commercial reuse matrix;
- discovery/onboarding/testing/production-readiness standards;
- continuous workflow quarry with provenance/no-pass preservation;
- MK1 scope/DoD;
- no critical documentation gate marked OPEN.

### W1 — BASELINE_LIBRARY_CERTIFIED
Requires K0 plus at least one reusable workflow package that has passed the full quarry and contains:

```text
workflow.json
manifest.yaml
config.schema.json
README.md
fixtures/
evidence/TEST-REPORT.md
```

and machine/human evidence for idempotency, provider failures, tenant isolation, secret redaction and side-effect safety.

### P1 — PILOT_PRODUCT_CERTIFIED
Requires W1 plus MK1 DoD with a production-like pilot: tenant/auth/RLS, real connector, two active automation instances, execution telemetry, incidents, ProcessRecord portal, Savings Engine, restore/rollback and incident drill.

## Important invariant

```text
K0 != W1 != P1
```

A signed K0 certificate must not claim that workflows are production-tested. A W1 certificate must not claim that the complete client portal/control plane has been proven in production.

## Certification failure conditions

Any of the following blocks the relevant level:
- required ADR missing;
- unresolved critical product/tenancy/secrets decision;
- workflow promoted without test evidence;
- unknown license/provenance treated as redistributable;
- plaintext secret/client-specific credential in approved artifact;
- critical cross-tenant risk unresolved;
- Savings Engine claims cash savings without evidence model;
- production claim made without actual runtime evidence.

## Signature

Certificates include:
- certification level;
- repository and branch;
- exact commit SHA;
- date;
- evidence paths;
- exclusions/open next-level gates;
- signer name (`Jett`) and model identity (`GPT-5.6 Sol`).
