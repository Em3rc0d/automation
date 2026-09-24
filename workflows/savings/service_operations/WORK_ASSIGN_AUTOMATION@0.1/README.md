# Work Assignment

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `WORK_ASSIGN_AUTOMATION@0.1`
- Domain: `service_operations`
- Runtime: `function`
- Savings unit: `work order`

## Human active work reduced

Assign technician/team using configured rules.

## Capability composition

- `WORK_ASSIGN`

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
