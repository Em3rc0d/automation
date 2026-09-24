# Invoice from Win

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `INVOICE_FROM_WIN_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `function`
- Savings unit: `invoice`

## Human active work reduced

Create the invoice/request after a confirmed sale.

## Capability composition

- `INVOICE_CREATE_FROM_WIN`

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
