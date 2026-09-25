# Runbook — Renewal Reminder

Verify contract status, renewal date, reminder offset, customer/owner contact and provider health.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
