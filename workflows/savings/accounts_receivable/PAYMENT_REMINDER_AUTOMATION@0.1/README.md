# Payment Reminder

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `PAYMENT_REMINDER_AUTOMATION@0.1`
- Domain: `accounts_receivable`
- Runtime: `scheduled`
- Savings unit: `invoice`

## Human active work reduced

Identify due/overdue invoices and send configured reminders.

## Capability composition

- `PAYMENT_REMINDER`

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
