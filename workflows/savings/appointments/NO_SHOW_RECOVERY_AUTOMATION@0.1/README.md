# No-show Recovery

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `NO_SHOW_RECOVERY_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `scheduled`
- Savings unit: `no-show`

## Human active work reduced

Detect missed appointments and trigger a recovery sequence.

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
