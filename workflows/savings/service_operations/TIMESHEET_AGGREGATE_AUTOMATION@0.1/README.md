# Timesheet Aggregation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `TIMESHEET_AGGREGATE_AUTOMATION@0.1`
- Domain: `service_operations`
- Runtime: `scheduled`
- Savings unit: `employee/day`

## Human active work reduced

Collect and aggregate reported hours.

## Capability composition

- `TIMESHEET_AGGREGATE`

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
