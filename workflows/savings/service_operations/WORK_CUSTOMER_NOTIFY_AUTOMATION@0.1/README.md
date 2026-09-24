# Work Customer Notification

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `WORK_CUSTOMER_NOTIFY_AUTOMATION@0.1`
- Domain: `service_operations`
- Runtime: `function`
- Savings unit: `status change`

## Human active work reduced

Notify customers when relevant work status changes.

## Capability composition

- `WORK_CUSTOMER_NOTIFY`

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
