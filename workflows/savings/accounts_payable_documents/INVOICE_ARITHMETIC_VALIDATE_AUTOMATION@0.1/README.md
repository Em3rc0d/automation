# Invoice Arithmetic Validation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `INVOICE_ARITHMETIC_VALIDATE_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `function`
- Savings unit: `invoice`

## Human active work reduced

Check subtotal/tax/discount/total arithmetic automatically.

## Capability composition

- `DOCUMENT_ARITHMETIC_VALIDATE`

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
