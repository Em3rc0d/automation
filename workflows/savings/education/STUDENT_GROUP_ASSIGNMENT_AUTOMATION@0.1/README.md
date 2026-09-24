# Student Group Assignment

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `STUDENT_GROUP_ASSIGNMENT_AUTOMATION@0.1`
- Domain: `education`
- Runtime: `function`
- Savings unit: `student`

## Human active work reduced

Assign students to the configured course/group.

## Capability composition

- `FIELD_MAP_TRANSFORM`

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
