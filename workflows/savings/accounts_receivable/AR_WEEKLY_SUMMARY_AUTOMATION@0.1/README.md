# AR Weekly Summary

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `AR_WEEKLY_SUMMARY_AUTOMATION@0.1`
- Domain: `accounts_receivable`
- Runtime: `scheduled`
- Savings unit: `report`

## Human active work reduced

Compile weekly receivables and collection exceptions.

## Capability composition

- `AR_WEEKLY_SUMMARY`

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
