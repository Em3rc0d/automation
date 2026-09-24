# Appointment Confirmation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `APPOINTMENT_CONFIRM_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `function`
- Savings unit: `appointment`

## Human active work reduced

Send confirmations after a successful booking.

## Capability composition

- `APPOINTMENT_CONFIRM`

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
