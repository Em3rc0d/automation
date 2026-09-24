# Budget Check

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `BUDGET_CHECK_AUTOMATION@0.1`
- Domain: `procurement`
- Runtime: `function`
- Savings unit: `request`

## Human active work reduced

Look up available budget before routing the purchase.

## Capability composition

- `BUDGET_CHECK`

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
