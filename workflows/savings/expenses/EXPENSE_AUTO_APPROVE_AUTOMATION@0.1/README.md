# Expense Auto-approval

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `EXPENSE_AUTO_APPROVE_AUTOMATION@0.1`
- Domain: `expenses`
- Runtime: `function`
- Savings unit: `expense`

## Human active work reduced

Auto-approve only claims that satisfy explicit policy.

## Capability composition

- `EXPENSE_AUTO_APPROVE`

## Execution skeleton

```text
trigger → validate → idempotency → capabilities → optional approval/exception → process record → SavingsEvent → telemetry
```

## Before production

- [ ] real baseline measured;
- [ ] source of truth identified;
- [ ] adapters/config bound;
- [ ] schemas specialized;
- [ ] retries/timeouts/idempotency tested;
- [ ] duplicate/provider-error/credential-expiry paths tested;
- [ ] savings counted once per business unit;
- [ ] HARDENED → TESTED → APPROVED_BASELINE;
- [ ] tenant acceptance passed.
