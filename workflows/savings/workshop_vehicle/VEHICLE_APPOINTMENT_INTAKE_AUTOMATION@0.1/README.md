# Vehicle Appointment Intake

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `VEHICLE_APPOINTMENT_INTAKE_AUTOMATION@0.1`
- Domain: `workshop_vehicle`
- Runtime: `function`
- Savings unit: `appointment`

## Human active work reduced

Register workshop booking requests.

## Capability composition

- `APPOINTMENT_REQUEST`

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
