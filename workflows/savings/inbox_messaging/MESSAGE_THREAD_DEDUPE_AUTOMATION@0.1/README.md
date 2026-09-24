# Message Thread Deduplication

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `MESSAGE_THREAD_DEDUPE_AUTOMATION@0.1`
- Domain: `inbox_messaging`
- Runtime: `function`
- Savings unit: `message`

## Human active work reduced

Avoid duplicate processing of the same conversation/event.

## Capability composition

- `MESSAGE_THREAD_DEDUPE`

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
