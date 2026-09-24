# Appointment Booking

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `APPOINTMENT_BOOK_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `function`
- Savings unit: `appointment`

## Human active work reduced

Create the chosen appointment without manual calendar entry.

## Capability composition

- `SLOT_HOLD`
- `APPOINTMENT_CREATE`

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
