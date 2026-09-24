# Offboarding Trigger

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `OFFBOARDING_TRIGGER_AUTOMATION@0.1`
- Domain: `hr_admin`
- Runtime: `function`
- Savings unit: `employee`

## Human active work reduced

Start the standard offboarding sequence.

## Capability composition

- `OFFBOARDING_TRIGGER`

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
