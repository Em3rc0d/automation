# Test Report — Lead Follow-up

VERDICT: PASS

runtime_profile: zero-deps-node-v1  
runtime_version: 20.19.5  
evidence_sha: e7bc6152bce2b6bd5fce6a222c6c3077b3c386f0  
workflow_run: Savings P0 Validation  
run_id: 36089006956  
job_id: 107927102957  
test_command: npm run validate  
test_count: 44  
pass_count: 44  
fail_count: 0  

## Workflow identity

- key: `LEAD_FOLLOWUP_AUTOMATION@0.1`
- implementation: `runtime/savings-p0/src/workflows/lead-followup.js`
- workflow-specific test: `runtime/savings-p0/test/lead-followup.test.js`
- deterministic demo: `runtime/savings-p0/demo/lead-followup/run.js`
- savings unit: `follow-up`

## demo_assertions

PASS — the all-reference demo assertion command completed successfully on the exact evidence SHA, including this workflow's deterministic demo.

## idempotency

PASS — the workflow-specific suite and shared runtime suite cover duplicate execution/side-effect protection appropriate to this workflow.

## failure_paths

PASS — provider/transient/permanent failure or workflow exception behavior is covered by the package fixtures and executable reference/runtime tests.

## tenant_scope

PASS — execution and local provider-neutral adapters require tenant-scoped access; cross-tenant behavior remains outside accepted paths.

## savings_event

PASS — automated units, exceptions/oversight and SavingsEvent accounting are exercised through the shared runtime.

## variable_cost

PASS — provider variable cost is attributed when applicable; zero-cost local reference execution does not hide modeled provider cost.

## limitations

- Tests use certified provider-neutral local adapters, not live third-party credentials.
- Client-specific provider scopes and real-system acceptance remain a later CLIENT_CONFIGURED / CLIENT_ACCEPTED gate.
- This TESTED verdict applies to the repository-controlled code-first baseline on the certified runtime profile.
- TESTED does not by itself mean APPROVED_BASELINE or production-ready for an individual tenant.

## Evidence integrity

The exact HARDENED branch SHA above passed:
- Repository Certification;
- Savings P0 Validation;
- W1/W2 validation;
- Baseline Factory Validation.

The Savings P0 job reported **44 tests / 44 pass / 0 fail**, and `npm run validate` executed the complete Node suite plus all 12 deterministic demos.

Next gate: explicit immutable promotion to `APPROVED_BASELINE`.
