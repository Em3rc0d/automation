# Lead to Appointment

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `LEAD_TO_APPOINTMENT_AUTOMATION@0.1`
- Domain: `sales_leads`
- Runtime: `durable`
- Savings unit: `appointment`

## Human active work reduced

Coordinate a booking after qualification.

## Capability composition

- `LEAD_HANDOFF_TO_APPOINTMENT`
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
