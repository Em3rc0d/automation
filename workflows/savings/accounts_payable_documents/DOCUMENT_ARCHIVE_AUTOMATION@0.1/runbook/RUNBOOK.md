# Runbook — Document Archive

Verify document ID/date/type, generated path, storage permissions and prior object before replay.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
