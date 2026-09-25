# Code-first Savings Workflow Package Contract

Status: **FACTORY AUTHORITY — RUNTIME-PROFILED**

This contract defines the package shape used by code-first Savings Workflows. It exists alongside the historical n8n quarry package contract; it does not silently reinterpret `workflow.json`.

## Package shape

```text
workflows/savings/<domain>/<KEY>@<version>/
├── manifest.yaml
├── README.md
├── config.schema.json
├── contracts/
│   ├── input.schema.json
│   └── output.schema.json
├── fixtures/
│   ├── happy-path.json
│   ├── duplicate.json
│   └── provider-error.json
├── tests/
│   └── TEST-PLAN.md
├── savings/
│   └── BASELINE.md
├── implementation/
│   └── flow.plan.yaml
├── runbook/
│   └── RUNBOOK.md
└── evidence/
    ├── REFERENCE-EVIDENCE.md
    └── TEST-REPORT.md        # required at TESTED+
```

The executable implementation is referenced from the registry/manifest and may live in a shared runtime package such as `runtime/savings-p0/src/workflows/`.

## DESIGN_READY / REFERENCE_IMPLEMENTED

May contain executable reference code and tests, but:
- canonical stage remains `DESIGN_READY`;
- runtime profile may still be uncertified;
- `readyForProduction` remains false;
- no `TESTED` or `APPROVED_BASELINE` claim is permitted.

## HARDENED

A code-first Savings Workflow can become HARDENED only if:

1. runtime profile is FACTORY-CERTIFIED;
2. manifest/registry identify the exact implementation profile/reference;
3. configuration and I/O contracts are specialized;
4. deterministic happy/duplicate/provider-error fixtures exist;
5. idempotency and retry/failure behavior are covered by executable tests;
6. tenant scope is explicit;
7. ProcessRecord / Incident / SavingsEvent behavior is implemented;
8. variable provider cost is captured where applicable;
9. exception/oversight minutes are not hidden;
10. runbook and rollback/replay behavior are documented;
11. no embedded secrets or live provider credentials exist;
12. SavingsBaseline unit is explicit and non-overlapping.

HARDENED is still not TESTED.

## TESTED

Requires all HARDENED requirements plus `evidence/TEST-REPORT.md` with:

```text
VERDICT: PASS
runtime_profile:
runtime_version:
evidence_sha:
test_command:
test_count:
fail_count: 0
demo_assertions:
idempotency:
failure_paths:
tenant_scope:
savings_event:
variable_cost:
limitations:
```

The test report must refer to an exact CI evidence SHA on the certified runtime profile.

## APPROVED_BASELINE

Requires TESTED plus explicit approval/promotion evidence. The approved artifact remains immutable by version.

For code-first Savings Workflows, approval does **not** require generating a fake n8n `workflow.json`.

## Client gate

APPROVED_BASELINE still requires tenant connector binding, real provider scopes, client fixture acceptance, agreed SavingsBaseline, production readiness and rollback before CLIENT_ACCEPTED.
