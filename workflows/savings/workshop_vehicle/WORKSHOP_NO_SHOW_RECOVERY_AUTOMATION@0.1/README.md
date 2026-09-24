# Workshop No-show Recovery

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `WORKSHOP_NO_SHOW_RECOVERY_AUTOMATION@0.1`
- Domain: `workshop_vehicle`
- Runtime: `scheduled`
- Savings unit: `no-show`

## Human active work reduced

Contact customers who missed workshop appointments.

## Capability composition

- `NO_SHOW_RECOVERY`

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
