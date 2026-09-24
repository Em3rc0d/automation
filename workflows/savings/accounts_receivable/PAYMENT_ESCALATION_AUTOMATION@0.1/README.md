# Payment Escalation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `PAYMENT_ESCALATION_AUTOMATION@0.1`
- Domain: `accounts_receivable`
- Runtime: `durable`
- Savings unit: `invoice`

## Human active work reduced

Move overdue invoices through configured collection tiers.

## Capability composition

- `PAYMENT_ESCALATION`

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
