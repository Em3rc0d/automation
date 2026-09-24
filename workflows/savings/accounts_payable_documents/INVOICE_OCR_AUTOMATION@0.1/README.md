# Invoice OCR Extraction

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `INVOICE_OCR_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `heavy`
- Savings unit: `invoice`

## Human active work reduced

Extract invoice fields instead of manual typing.

## Capability composition

- `INVOICE_OCR_EXTRACT`

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
