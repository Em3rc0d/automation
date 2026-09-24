# Unanswered Message Watchdog

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION@0.1`
- Domain: `inbox_messaging`
- Runtime: `scheduled`
- Savings unit: `thread`

## Human active work reduced

Find conversations with no response inside SLA.

## Capability composition

- `UNANSWERED_MESSAGE_WATCHDOG`

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
