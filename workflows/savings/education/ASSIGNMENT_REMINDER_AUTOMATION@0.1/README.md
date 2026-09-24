# Assignment Reminder

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `ASSIGNMENT_REMINDER_AUTOMATION@0.1`
- Domain: `education`
- Runtime: `scheduled`
- Savings unit: `student/task`

## Human active work reduced

Find pending assignments and remind students.

## Capability composition

- `EVENT_REMINDER`

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
