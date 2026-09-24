# Payment Reconciliation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `PAYMENT_RECONCILIATION_AUTOMATION@0.1`
- Domain: `accounts_receivable`
- Runtime: `function`
- Savings unit: `payment`

## Human active work reduced

Match received payments to outstanding invoices.

## Capability composition

- `PAYMENT_RECONCILE`

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
