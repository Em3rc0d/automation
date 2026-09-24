# Customer Reactivation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `REACTIVATION_CAMPAIGN_AUTOMATION@0.1`
- Domain: `feedback_retention`
- Runtime: `scheduled`
- Savings unit: `customer`

## Human active work reduced

Find eligible inactive customers and contact them.

## Capability composition

- `REACTIVATION_CAMPAIGN`

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
