# Baseline Factory Status

Updated: 2026-09-11

## Certification state

```text
K0 FOUNDATION                 CERTIFIED / ARCHIVED
F1 FACTORY_OPERATIONAL        CERTIFIED
W1 BASELINE LIBRARY           IN PROGRESS
P1 PILOT PRODUCT              NOT OPEN
```

## F1 authority

- evidence branch: `w1/baseline-library`
- evidence SHA: `283a8867bfb7176ced5d27cfa1b90e22a022e181`
- evidence tree: `21c20e358a17bd25a01f9f23b76d887c3e2fbcb0`
- exact push run: `34632134059`
- factory job: `103371255901`
- conclusion: **SUCCESS**
- evidence artifact: `10276089734`
- artifact digest: `sha256:b30bebcbbee898f2ad728f9360c3f45d2246ab00bd0e62db4c2801fa687195bc`

Certificate: `certification/F1-FACTORY-CERTIFICATE.md`.

## Certified runtime extension

Certified profile: `zero-deps-node-v1`

```text
Reference workflows          12/12 executable
Runtime dependencies          0
Paid test infrastructure      0
Factory profile certificate   CERTIFIED
Canonical workflow HARDENED   12/12
Canonical workflow TESTED     12/12
Canonical workflow approval    0/12
```

The original `n8n-base-js-v1` F1 certificate remains historical evidence for its original scope. The factory's certified scope now also includes `zero-deps-node-v1` under `certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md`.

### zero-deps-node-v1 evidence

- zero-deps evidence SHA: `8475fcd95817098c59cd1088b543e4881bd3fe38`
- Baseline Factory Validation: `36087356818`
- factory job: `107922114438` — SUCCESS
- profile job: `107922514846` — SUCCESS
- profile artifact: `10843959001`
- profile digest: `sha256:dc88223294c020b87ffe5f35c01f29d576d75fb897ef4521122bba81ed87c64c`
- tests: **44/44 PASS**
- certificate: `certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md`

## Certified runtime profiles

### n8n-base-js-v1

- profile: `n8n-base-js-v1`
- engine: n8n
- pinned runtime: `2.38.7`
- runtime: Docker Compose
- mock control plane: WireMock `3.9.1`
- supported base nodes: built-in `n8n-nodes-base.*`
- Code node language in this profile: JavaScript

Python Code, arbitrary community nodes, undeclared binaries/custom images and live third-party credentials are outside the n8n F1 profile until separately implemented and certified.

### zero-deps-node-v1

- profile: `zero-deps-node-v1`
- engine: Node.js
- pinned certification runtime: `20.19.5`
- dependencies: 0
- paid test infrastructure: 0
- direct network/provider bindings: excluded
- reference workflows: 12/12

## Factory capabilities proven by F1

- bulk discovery/indexing without deletion or implicit approval;
- exact SHA/provenance + semantic fingerprint inventory;
- immutable human gate records for discovery/license/inspection/testing/approval decisions;
- HARDENED package contract validation;
- stable unique n8n workflow IDs;
- no bound repository credential references;
- non-destructive failure preservation under `no-pass-verified`;
- non-destructive TESTED -> APPROVED/library promotion with overwrite refusal;
- pinned n8n startup/health/version verification;
- mock control-plane reachability from runtime network;
- runtime probe import and execution;
- all current HARDENED workflows import into the certified runtime: **2/2** at the evidence SHA;
- raw cache/environment-secret tracking guard;
- uploaded CI evidence artifact.

## Preservation

F1 was built additively over sealed K0. Comparison from K0 final SHA `8cb866805d895dc185dfaa232eddecaa346ab478` to the F1 evidence SHA was ahead-only (`48` commits, `0` behind) and the compared changes were additions; K0 remains archived separately.

## Important boundary

`F1 FACTORY_OPERATIONAL` certifies the machinery used to manufacture, test, preserve and promote workflow baselines within the declared runtime profile. It does **not** convert HARDENED candidates into TESTED/APPROVED baselines automatically.

Current W1 inventory remains:

```text
HARDENED                 2
TESTED                    0
APPROVED_BASELINE         0
```

Individual component certification resumes only after this factory seal.


## W-SAVINGS-P0 canonical lifecycle

The 12 zero-cost reference workflows have moved from reference-only design state to **HARDENED** under the code-first Savings package contract.

```text
HARDENED                 12
TESTED                    12
APPROVED_BASELINE           0
```

Each HARDENED package binds to the certified `zero-deps-node-v1` runtime and carries an explicit hardening report. Exact-SHA workflow test reports are the next gate.


Exact-SHA TESTED evidence:
- SHA: `e7bc6152bce2b6bd5fce6a222c6c3077b3c386f0`
- Savings P0 Validation run: `36089006956`
- job: `107927102957`
- result: **44/44 PASS + all deterministic demos PASS**
