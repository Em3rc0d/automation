# Vehicle Ready Notification

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `VEHICLE_READY_NOTIFY_AUTOMATION@0.1`
- Domain: `workshop_vehicle`
- Runtime: `function`
- Savings unit: `vehicle`

## Human active work reduced

Notify the customer when the work order reaches ready state.

## Capability composition

- `WORK_CUSTOMER_NOTIFY`

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
