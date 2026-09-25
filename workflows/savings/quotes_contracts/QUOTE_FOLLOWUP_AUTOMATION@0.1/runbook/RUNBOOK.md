# Runbook — Quote Follow-up

Inspect quote status, delivery timestamp, completedStages and customer contact before replay.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
