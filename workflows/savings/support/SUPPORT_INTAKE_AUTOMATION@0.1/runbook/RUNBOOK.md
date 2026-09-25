# Runbook — Support Intake

Check source event identity, request body, tenant binding and ticket-store connectivity.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
