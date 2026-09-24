# Work SLA Watchdog

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `WORK_SLA_WATCHDOG_AUTOMATION@0.1`
- Domain: `service_operations`
- Runtime: `scheduled`
- Savings unit: `work order`

## Human active work reduced

Monitor overdue work orders.

## Capability composition

- `WORK_SLA_WATCHDOG`

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
