# Runbook — Low Stock Alert

Check inventory freshness, thresholds, alert contact and whether stock changed since the last fingerprint.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
