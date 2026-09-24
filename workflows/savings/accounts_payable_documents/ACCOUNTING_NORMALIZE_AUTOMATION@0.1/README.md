# Accounting Document Normalization

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `ACCOUNTING_NORMALIZE_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `function`
- Savings unit: `document`

## Human active work reduced

Transform extracted fields to the accounting contract.

## Capability composition

- `ACCOUNTING_NORMALIZE`

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
