# F1 — Baseline Factory Operational Certification

`F1 FACTORY_OPERATIONAL` is a separate certification level from K0, W1 workflow certification, and P1 product certification.

## F1 proves

The repository can reproducibly manufacture workflow baselines through the governed pipeline. It does not prove that any specific business workflow is production-safe.

## Mandatory same-SHA gates

```text
[ ] K0 repository validator PASS
[ ] W1 hardened package validator PASS
[ ] factory static validator PASS
[ ] non-destructive self-test PASS
[ ] Docker Compose configuration PASS
[ ] n8n runtime pinned (no latest)
[ ] pinned n8n starts healthy
[ ] n8n reports the expected pinned version
[ ] mock control-plane reachable from n8n network
[ ] runtime probe imports successfully
[ ] runtime probe executes successfully
[ ] every HARDENED workflow imports successfully
[ ] no bound client credentials/secrets in candidates
[ ] failure path preserves source evidence
[ ] promotion path preserves TESTED source and copies to both approved destinations
[ ] CI logs identify exact commit SHA and runtime version
```

## Operational factory contract

### Intake
Every candidate has provenance metadata even when raw redistribution is blocked.

### Gate preservation
A failed gate never deletes the candidate. Failure evidence goes to `no-pass-verified`.

### Hardening
HARDENED packages require executable workflow JSON, manifest, config schema, fixtures, docs, and test plan.

### Runtime
The factory imports against the pinned runtime before candidate testing. Runtime upgrades require rerunning F1.

### Testing
Business/runtime fixture tests create `evidence/TEST-REPORT.md`. Import success alone is not `TESTED`.

### Promotion
Only a TESTED package containing exact `VERDICT: PASS` can promote. Promotion is copy-only; existing versions are never overwritten.

### Rollback
Approved packages are immutable by version. A regression creates a new version or a superseded/failure record; historical evidence remains.

## Invalidation
F1 is invalidated and must be re-certified if any of the following changes:

- pinned n8n runtime version;
- promotion semantics;
- failure-preservation semantics;
- package contract;
- quarry stage model;
- runtime harness or factory CI in a way that changes gates.

## Required certificate

`certification/F1-FACTORY-CERTIFICATE.md` may be created only after the GitHub Actions factory workflow finishes `SUCCESS` on the exact evidence SHA.