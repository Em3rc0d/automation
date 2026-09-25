# Lead Follow-up — Reference Evidence

Executable under `zero-deps-node-v1`.

Paths:
- code: `runtime/savings-p0/src/workflows/lead-followup.js`;
- tests: `runtime/savings-p0/test/lead-followup.test.js`;
- demo: `runtime/savings-p0/demo/lead-followup/run.js --assert`;
- CI: `.github/workflows/savings-p0-validation.yml`.

The implementation demonstrates a durable multi-stage process through persisted workflow state rather than an always-on waiting container.

Boundary: **REFERENCE_IMPLEMENTED != TESTED != APPROVED_BASELINE**.
