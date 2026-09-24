# Receipt OCR Extraction

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `RECEIPT_OCR_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `heavy`
- Savings unit: `receipt`

## Human active work reduced

Extract receipt fields instead of manual typing.

## Capability composition

- `RECEIPT_OCR_EXTRACT`

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
