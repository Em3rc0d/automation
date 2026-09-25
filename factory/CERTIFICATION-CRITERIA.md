# F1 — Baseline Factory Operational Certification

`F1 FACTORY_OPERATIONAL` is a separate certification level from K0, W1 workflow certification, and P1 product certification.

## F1 proves

The repository can reproducibly manufacture workflow baselines through the governed pipeline. It does not prove that any specific business workflow is production-safe.

## Mandatory same-SHA gates

```text
[ ] K0 repository validator PASS
[ ] discovery/indexer self-test PASS
[ ] immutable human gate-evidence self-test PASS
[ ] W1 hardened package validator PASS
[ ] factory static validator PASS
[ ] non-destructive promotion/failure self-test PASS
[ ] Docker Compose configuration PASS
[ ] explicit runtime support policy present
[ ] n8n runtime pinned (no latest)
[ ] pinned n8n starts healthy
[ ] n8n reports the expected pinned version
[ ] mock control-plane reachable from n8n network
[ ] runtime probe imports successfully
[ ] runtime probe executes successfully
[ ] every HARDENED workflow imports successfully
[ ] discovered HARDENED count equals imported HARDENED count
[ ] unsupported Python/community-node candidates blocked from base profile
[ ] no bound client credentials/secrets in candidates
[ ] failure path preserves source evidence
[ ] promotion path preserves TESTED source and copies to both approved destinations
[ ] CI logs identify exact branch commit SHA and runtime version
[ ] evidence artifact uploaded for the exact factory run
```

## Additional runtime profile gate

Adding `zero-deps-node-v1` requires the full existing F1 gate **plus** the following checks on the same SHA:

```text
[ ] Node runtime pinned to 20.19.5
[ ] zero-deps profile manifest/static validator PASS
[ ] package.json declares no runtime/dev/optional/peer dependencies
[ ] source imports only relative modules + declared Node built-ins
[ ] direct network/fetch/child-process/process.env access blocked in profile source
[ ] W-SAVINGS-P0 reports 12/12 REFERENCE_IMPLEMENTED
[ ] every selected registry implementation reference/test/demo exists
[ ] Savings package validator PASS
[ ] complete Node test suite PASS
[ ] all 12 deterministic demos PASS
[ ] runtime import smoke PASS
[ ] no node_modules or local secret files tracked
[ ] profile evidence artifact uploaded for exact SHA
```

Passing these gates certifies the **runtime substrate only**. Workflow business correctness still advances separately through HARDENED → TESTED → APPROVED_BASELINE.

## Operational factory contract

### Discovery / intake
The existing bulk quarry indexer must parse a synthetic corpus, emit `candidates.jsonl`, retain exact SHA/provenance/semantic fingerprint metadata and explicitly perform no approval or deletion.

### Human gates
Licensing, provenance interpretation, security review and approval remain human-accountable decisions. `factory/tools/record_gate.py` records those decisions immutably with actor, evidence reference and source hash. The tool must never pretend an automated heuristic is a legal/license decision.

### Gate preservation
A failed gate never deletes the candidate. Failure evidence goes to `no-pass-verified` and can later re-enter after remediation.

### Hardening
For `n8n-base-js-v1`, HARDENED packages require executable workflow JSON, manifest, config schema, fixtures, docs, test plan, stable unique n8n workflow/node IDs and explicit runtime profile. A separately certified code-first profile may use its own runtime-specific implementation package contract, but that contract must be explicitly validated before any package is called HARDENED.

### Runtime profile
F1 certifies only the scope in `factory/RUNTIME-SUPPORT-POLICY.md`. The initial profile is `n8n-base-js-v1` on n8n `2.38.7`. Python Code execution, arbitrary community nodes and undeclared external binaries are blocked until separately profiled and certified.

### Runtime
The factory imports against the pinned runtime before candidate testing. Runtime upgrades require rerunning F1. Runtime smoke must import **all** HARDENED candidates discovered in the branch, not a sample.

### Testing
Business/runtime fixture tests create `evidence/TEST-REPORT.md`. Import success alone is not `TESTED`.

### Promotion
Only a TESTED package containing exact `VERDICT: PASS` can promote. Promotion is copy-only; existing versions are never overwritten.

### Rollback / supersession
Approved packages are immutable by version. A regression creates a new version or a superseded/failure record; historical evidence remains.

## Invalidation
F1 is invalidated and must be re-certified if any of the following changes materially:

- pinned n8n runtime version;
- certified runtime profile;
- discovery/indexing semantics;
- human gate-record semantics;
- promotion semantics;
- failure-preservation semantics;
- package contract;
- quarry stage model;
- runtime harness or factory CI gates.

## Required certificate

`certification/F1-FACTORY-CERTIFICATE.md` may be created only after the GitHub Actions `Baseline Factory Validation` workflow finishes `SUCCESS` on the exact **push-event branch SHA** used as evidence.

The certificate must state that F1 certifies factory mechanics/governance, not individual W1 baseline correctness.