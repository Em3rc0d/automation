# Runbook — Lead Intake Automation

Check source event ID, malformed identity fields, tenant binding and target lead store before replay.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
