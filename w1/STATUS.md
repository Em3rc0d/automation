# W1 Status Ledger

Updated: 2026-09-11

## Base

- K0 final attestation commit: `8cb866805d895dc185dfaa232eddecaa346ab478`
- K0 final CI run: `34628865822` — **SUCCESS**
- K0 archive branch: `archive/k0-certified-final`
- W1 working branch: `w1/baseline-library`

## Current W1 state

```text
HARDENED CANDIDATES      2
TESTED                    0
APPROVED_BASELINE         0
W1 CERTIFIED              NO
```

## Hardened candidates

### EXECUTION_TELEMETRY@1.0

Path:
`quarries/workflow-quarry/30-hardened/platform/EXECUTION_TELEMETRY@1.0/`

Contains:
- executable n8n `workflow.json`;
- manifest;
- config schema;
- documentation;
- valid/invalid/duplicate fixtures;
- 10-case runtime test plan.

Current decision: **HARDENED / WAITING FOR RUNTIME TEST**.

### ERROR_TO_INCIDENT@1.0

Path:
`quarries/workflow-quarry/30-hardened/platform/ERROR_TO_INCIDENT@1.0/`

Contains:
- executable n8n `workflow.json`;
- manifest;
- config schema;
- documentation;
- valid/redaction/invalid/duplicate fixtures;
- 10-case runtime test plan.

Current decision: **HARDENED / WAITING FOR RUNTIME TEST**.

## Static W1 gate

Validator:
`tools/validate_w1_candidates.py`

Workflow:
`.github/workflows/w1-candidate-validation.yml`

First successful W1 validation run:

- run: `34629326825`
- head: `bd8c37321a84a7bf4547db0bb7baf747e6807d66`
- conclusion: **SUCCESS**

This gate checks package structure, JSON/config parseability, HARDENED metadata, fixtures/test-plan presence and absence of bound n8n credential references.

It does **not** certify runtime behavior.

## Next executable gate

Before any candidate moves to `40-tested`:

1. pin the n8n runtime version/environment;
2. provide a test control-plane/mock endpoint;
3. import workflows cleanly;
4. execute every documented fixture/test case;
5. capture execution IDs/evidence;
6. write `evidence/TEST-REPORT.md`;
7. move only passing candidates to `40-tested`;
8. preserve failed evidence under `no-pass-verified` rather than deleting it.

## Preservation statement

No K0 research, mining source, candidate, blocked source or `no-pass-verified` artifact has been deleted to start W1.

W1 is additive and evidence-driven.
