# Post-ticket Survey

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `POST_TICKET_SURVEY_AUTOMATION@0.1`
- Domain: `support`
- Runtime: `scheduled`
- Savings unit: `ticket`

## Human active work reduced

Send a feedback request after ticket closure.

## Capability composition

- `POST_TICKET_SURVEY`

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
