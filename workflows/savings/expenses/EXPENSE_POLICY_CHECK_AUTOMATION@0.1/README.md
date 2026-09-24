# Expense Policy Check

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `EXPENSE_POLICY_CHECK_AUTOMATION@0.1`
- Domain: `expenses`
- Runtime: `function`
- Savings unit: `expense`

## Human active work reduced

Evaluate routine policy rules automatically.

## Capability composition

- `EXPENSE_POLICY_CHECK`

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
