# Material Pending Watchdog

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CLASS_MATERIAL_WATCHDOG_AUTOMATION@0.1`
- Domain: `education`
- Runtime: `scheduled`
- Savings unit: `class`

## Human active work reduced

Detect classes whose material has not been uploaded.

## Capability composition

- `THRESHOLD_ALERT`

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
