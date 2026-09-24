# Expense Receipt Extraction

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `EXPENSE_RECEIPT_EXTRACT_AUTOMATION@0.1`
- Domain: `expenses`
- Runtime: `heavy`
- Savings unit: `expense`

## Human active work reduced

Extract receipt fields instead of manual typing.

## Capability composition

- `RECEIPT_EXTRACT`

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
