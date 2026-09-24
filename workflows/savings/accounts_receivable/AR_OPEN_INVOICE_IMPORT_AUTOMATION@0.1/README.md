# Open Invoice Import

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `AR_OPEN_INVOICE_IMPORT_AUTOMATION@0.1`
- Domain: `accounts_receivable`
- Runtime: `scheduled`
- Savings unit: `invoice`

## Human active work reduced

Import open receivables from the source system.

## Capability composition

- `AR_IMPORT_OPEN_INVOICES`

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
