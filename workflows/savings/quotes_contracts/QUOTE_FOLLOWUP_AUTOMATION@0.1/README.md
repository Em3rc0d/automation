# Quote Follow-up

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `QUOTE_FOLLOWUP_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `scheduled`
- Savings unit: `quote`

## Human active work reduced

Review pending quotes and contact customers on schedule.

## Capability composition

- `QUOTE_FOLLOWUP`

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
