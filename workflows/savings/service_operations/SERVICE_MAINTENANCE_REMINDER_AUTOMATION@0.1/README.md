# Maintenance Reminder

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `SERVICE_MAINTENANCE_REMINDER_AUTOMATION@0.1`
- Domain: `service_operations`
- Runtime: `scheduled`
- Savings unit: `asset/customer`

## Human active work reduced

Find upcoming maintenance and contact the customer.

## Capability composition

- `SERVICE_MAINTENANCE_REMINDER`

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
