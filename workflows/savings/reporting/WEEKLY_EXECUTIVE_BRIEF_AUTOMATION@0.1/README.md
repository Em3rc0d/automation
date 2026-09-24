# Weekly Executive Brief

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `WEEKLY_EXECUTIVE_BRIEF_AUTOMATION@0.1`
- Domain: `reporting`
- Runtime: `scheduled`
- Savings unit: `week`

## Human active work reduced

Build and deliver a weekly management brief.

## Capability composition

- `WEEKLY_EXECUTIVE_BRIEF`

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
