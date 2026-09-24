# Data Aggregation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `DATA_AGGREGATE_AUTOMATION@0.1`
- Domain: `reporting`
- Runtime: `scheduled`
- Savings unit: `report run`

## Human active work reduced

Collect recurring operational data from source systems.

## Capability composition

- `DATA_AGGREGATE`

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
