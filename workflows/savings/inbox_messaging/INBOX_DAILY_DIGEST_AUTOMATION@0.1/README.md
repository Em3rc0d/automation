# Inbox Daily Digest

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `INBOX_DAILY_DIGEST_AUTOMATION@0.1`
- Domain: `inbox_messaging`
- Runtime: `scheduled`
- Savings unit: `day`

## Human active work reduced

Summarize relevant inbox items into one daily brief.

## Capability composition

- `INBOX_DAILY_DIGEST`

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
