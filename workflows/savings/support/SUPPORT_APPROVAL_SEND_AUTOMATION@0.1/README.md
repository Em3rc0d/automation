# Support Human-approved Send

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `SUPPORT_APPROVAL_SEND_AUTOMATION@0.1`
- Domain: `support`
- Runtime: `human_loop`
- Savings unit: `ticket`

## Human active work reduced

Route sensitive outbound replies to approval then send.

## Capability composition

- `SUPPORT_HUMAN_APPROVAL`

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
