# Approved Baseline Promotion — Appointment Reminder

Decision: **APPROVED_BASELINE**  
Workflow: `APPOINTMENT_REMINDER_AUTOMATION@0.1`  
Runtime: `zero-deps-node-v1`

## Immutable tested source

- canonical TESTED source commit: `f7dc2478855ac06dd9aaabbbae4e8a3657365802`
- exact test evidence SHA: `c4488c852261d09f54561a623f4f96296280e096`
- Savings P0 Validation run: `36089328606`
- job: `107928100134`
- command: `npm run validate`
- result: **44 tests / 44 pass / 0 fail + all deterministic demos PASS**

The approved baseline record points to the exact TESTED repository snapshot rather than copying a fake runtime-specific artifact.

## Approval mechanism

This promotion becomes effective only when the repository pull request containing this record is merged to `main`. The merge itself is the explicit repository approval event.

The approved version is immutable: changes to implementation semantics, runtime boundary, contracts or baseline package require a new workflow version or an explicit supersession record.

## Client boundary

APPROVED_BASELINE means this is a trusted reusable starting implementation. It is **not** automatically production-ready for a tenant.

Before `CLIENT_ACCEPTED`:
- tenant configuration must be bound;
- real connector/provider scopes must be verified;
- real client fixtures must pass;
- SavingsBaseline must be agreed;
- approval policy must be configured;
- provider cost/quota policy must be accepted;
- production rollback/replay must be verified.

No dedicated tenant infrastructure is implied by approval.
