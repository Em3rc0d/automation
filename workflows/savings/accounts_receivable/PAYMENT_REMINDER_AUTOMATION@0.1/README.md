# Payment Reminder

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `PAYMENT_REMINDER_AUTOMATION@0.1`
- Domain: `accounts_receivable`
- Runtime: `scheduled`
- Savings unit: `invoice`

## Human active work reduced

Identify due/overdue invoices and send configured reminders.

## Capability composition

- `PAYMENT_REMINDER`

## Reference implementation

- Runtime profile: `zero-deps-node-v1`
- Implementation: `runtime/savings-p0/src/workflows/payment-reminder.js`
- Tests: `runtime/savings-p0/test/payment-reminder.test.js`
- Demo: `runtime/savings-p0/demo/payment-reminder/run.js`
- Wave: `w-savings-p0/`

Reference CI proves executable behavior, idempotency, retry handling, exception accounting and SavingsEvent generation. It does **not** promote this package to repository-level TESTED or APPROVED_BASELINE.

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
