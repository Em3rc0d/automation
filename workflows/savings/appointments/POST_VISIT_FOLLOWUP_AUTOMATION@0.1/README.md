# Post-visit Follow-up

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `POST_VISIT_FOLLOWUP_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `scheduled`
- Savings unit: `visit`

## Human active work reduced

Send the configured post-service follow-up.

## Capability composition

- `APPOINTMENT_POST_VISIT`

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
