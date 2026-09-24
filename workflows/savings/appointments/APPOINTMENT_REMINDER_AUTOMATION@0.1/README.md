# Appointment Reminder

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `APPOINTMENT_REMINDER_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `scheduled`
- Savings unit: `reminder`

## Human active work reduced

Review upcoming appointments and remind attendees.

## Capability composition

- `APPOINTMENT_REMIND`

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
