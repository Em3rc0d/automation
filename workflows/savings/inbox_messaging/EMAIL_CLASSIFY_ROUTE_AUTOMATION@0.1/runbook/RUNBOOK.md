# Runbook — Email Classification and Routing

Check rule ordering, source email ID and route-store availability; classification is deterministic, not AI.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
