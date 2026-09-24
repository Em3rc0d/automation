# Runbook — PO Match

Monitor success/failure, last success, connector health, automated `invoice`, exceptions, variable cost and incidents.

Common failures: credential expiry, provider outage, malformed/stale source data, replay, config mismatch, tenant mismatch, cost spike.

Operator: inspect tenant/workflow/trace → pause unsafe installation → repair dependency/config → replay with original idempotency → verify process and SavingsEvent count → audit customer-visible impact.

Define rollback and reconciliation before APPROVED_BASELINE.
