# Availability Reply

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `AVAILABILITY_REPLY_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `function`
- Savings unit: `request`

## Human active work reduced

Check calendar availability and return valid slots.

## Capability composition

- `AVAILABILITY_CHECK`

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
