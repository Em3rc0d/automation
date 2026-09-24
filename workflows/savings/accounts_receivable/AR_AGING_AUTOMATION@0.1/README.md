# AR Aging Calculation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `AR_AGING_AUTOMATION@0.1`
- Domain: `accounts_receivable`
- Runtime: `scheduled`
- Savings unit: `invoice`

## Human active work reduced

Calculate days outstanding and aging buckets.

## Capability composition

- `AR_AGING_CALCULATE`

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
