# Appointment Reschedule

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `APPOINTMENT_RESCHEDULE_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `durable`
- Savings unit: `reschedule`

## Human active work reduced

Find a new slot, update calendar and confirm the change.

## Capability composition

- `APPOINTMENT_RESCHEDULE`
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
