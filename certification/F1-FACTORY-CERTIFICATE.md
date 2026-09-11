# F1 Baseline Factory Operational Certificate

## Decision

**CERTIFIED — F1 / FACTORY_OPERATIONAL**

Repository: `Em3rc0d/automation`  
Working branch: `w1/baseline-library`  
Certification date: 2026-09-11

## Evidence identity

- Evidence commit: `283a8867bfb7176ced5d27cfa1b90e22a022e181`
- Evidence tree: `21c20e358a17bd25a01f9f23b76d887c3e2fbcb0`
- GitHub Actions workflow: `Baseline Factory Validation`
- Exact push-event run: `34632134059`
- Job: `103371255901`
- Result: **SUCCESS**
- Evidence artifact ID: `10276089734`
- Evidence artifact name: `factory-validation-283a8867bfb7176ced5d27cfa1b90e22a022e181`
- Artifact digest: `sha256:b30bebcbbee898f2ad728f9360c3f45d2246ab00bd0e62db4c2801fa687195bc`

The certificate commit is created after the evidence snapshot it attests. The certificate commit itself must pass the same factory validation workflow before this seal is considered fully closed.

## Certified scope

I certify that the Baseline Factory is operational for the explicitly declared runtime profile `n8n-base-js-v1` and can reproducibly govern the path from mined material to approved reusable workflow packages without deleting historical evidence.

The evidence run proved, on the same exact branch SHA:

1. K0 repository invariants passed.
2. W1 HARDENED package validation passed.
3. Factory structural/runtime-policy validation passed.
4. Discovery/indexing self-test parsed a synthetic n8n corpus and emitted provenance/hash/fingerprint inventory with zero deletion and zero automatic approval.
5. Human gate evidence was recorded immutably for discovery, license and inspection decisions with `automatedDecision: false` and preserved source hashes.
6. Promotion dry-run passed.
7. Actual synthetic TESTED -> APPROVED/library promotion passed using copy semantics; source remained intact.
8. Synthetic failure recording under `no-pass-verified` passed; source remained intact and re-entry remained possible.
9. Docker Compose configuration passed.
10. n8n started healthy and reported the pinned version `2.38.7`.
11. The mock control-plane was reachable from the n8n runtime network.
12. The runtime probe imported successfully.
13. The runtime probe executed successfully.
14. Every current HARDENED candidate was discovered and imported into the pinned runtime: **2 discovered / 2 imported**.
15. External raw-cache and tracked local-secret guards passed.
16. A CI evidence artifact was uploaded with the SHA-256 digest recorded above.

## Certified runtime profile

```text
profile                n8n-base-js-v1
n8n                     2.38.7
runtime                 Docker Compose
nodes                   built-in n8n-nodes-base.*
Code language           JavaScript
mock integration        WireMock 3.9.1
repository credentials  unbound
```

This certificate deliberately does **not** claim universal n8n compatibility.

Explicitly outside this F1 profile until separately implemented and certified:

- Python Code execution or Python task runners;
- arbitrary community nodes;
- browser automation runtimes;
- undeclared external binaries/custom Docker images;
- GPU-specific workloads;
- live third-party/provider credentials.

During runtime evidence n8n emitted a non-fatal Python task-runner warning because Python 3 is absent from the base n8n image. The factory does not hide this warning: `factory/RUNTIME-SUPPORT-POLICY.md` explicitly excludes Python from `n8n-base-js-v1`, and the static W1 validator blocks candidates requiring Python/community-node execution under this profile.

## Factory governance certified

The operational manufacturing path is:

```text
DISCOVERED
-> LICENSE_CHECKED
-> INSPECTED
-> HARDENED
-> runtime/import gate
-> TESTED
-> APPROVED_BASELINE
```

The factory automates evidence capture and mechanical gates, not legal judgment. Licensing/provenance/security/approval decisions remain human-accountable and are recorded with actor, source hash and evidence references.

A failed gate is never synonymous with deletion. Failed candidates and evidence are preserved under `no-pass-verified`; duplicates may be grouped semantically but their provenances remain.

Promotion is versioned and non-destructive. Existing approved destinations are never overwritten; the TESTED source stays preserved while copies are created in the approved quarry and `workflows/n8n/` trusted library.

## K0 preservation

F1 was built on top of, not instead of, the certified K0 foundation.

- K0 final seal: `8cb866805d895dc185dfaa232eddecaa346ab478`
- F1 evidence SHA: `283a8867bfb7176ced5d27cfa1b90e22a022e181`
- comparison: **ahead 48 / behind 0**

The compared F1 work was additive; sealed K0 remains preserved on archival branches including `archive/k0-certified-final`.

## Defects caught before certification

The factory gate itself exposed and forced correction of real problems before this certificate:

- n8n 2.38.7 refused candidate imports lacking stable top-level workflow IDs; stable IDs were added and made a static requirement.
- an initial runtime loop imported only one of two HARDENED candidates because the child command consumed loop stdin; the harness was rewritten to enumerate candidates first and now fails unless discovered count exactly equals imported count.
- Python runner availability was found to be outside the tested base runtime and was converted into an explicit support boundary rather than silently ignored.

These failures are evidence that F1 is based on executed gates rather than documentation-only claims.

## Explicitly NOT certified by F1

### W1 — BASELINE_LIBRARY_CERTIFIED
**NOT CERTIFIED.**

Current state remains:

```text
HARDENED             2
TESTED                0
APPROVED_BASELINE     0
```

F1 proves the factory can manufacture/test/promote baselines; it does not prove the business/runtime test plans of individual components have passed.

### P1 — PILOT_PRODUCT_CERTIFIED
**NOT CERTIFIED.**

The operator console/client portal/tenant runtime remains a later product gate.

### Commercial/legal deployment rights

F1 is a technical/governance certification, not legal advice and not a blanket license grant for n8n or Internet-mined code. Existing licensing/provenance gates remain mandatory before commercial reuse or redistribution.

## Invalidation / re-certification rule

F1 must be re-certified if there is a material change to:

- pinned n8n version;
- certified runtime profile;
- discovery/indexer semantics;
- human gate-record semantics;
- HARDENED package contract;
- promotion semantics;
- failure/no-pass preservation semantics;
- quarry stage model;
- runtime harness or factory CI gates.

## Verdict

```text
K0  KNOWLEDGE / ARCHITECTURE       CERTIFIED
F1  BASELINE FACTORY               CERTIFIED / OPERATIONAL
W1  BASELINE LIBRARY               IN PROGRESS / NOT CERTIFIED
P1  PILOT PRODUCT                  NOT CERTIFIED
```

**PASS — the factory is operational and authorized to manufacture W1 candidates within the certified `n8n-base-js-v1` scope.**

---

Signed,

**Jett**  
GPT-5.6 Sol  
2026-09-11
