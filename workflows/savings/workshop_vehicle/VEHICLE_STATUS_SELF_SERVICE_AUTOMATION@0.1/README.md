# Vehicle Status Self-service

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `VEHICLE_STATUS_SELF_SERVICE_AUTOMATION@0.1`
- Domain: `workshop_vehicle`
- Runtime: `function`
- Savings unit: `query`

## Human active work reduced

Answer customer status queries from the current work order.

## Capability composition

- `WORK_STATUS_SYNC`

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
