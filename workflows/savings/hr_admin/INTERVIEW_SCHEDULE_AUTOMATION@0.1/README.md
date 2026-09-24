# Interview Scheduling

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `INTERVIEW_SCHEDULE_AUTOMATION@0.1`
- Domain: `hr_admin`
- Runtime: `durable`
- Savings unit: `interview`

## Human active work reduced

Coordinate available times between candidate and interviewer.

## Capability composition

- `INTERVIEW_SCHEDULE`

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
