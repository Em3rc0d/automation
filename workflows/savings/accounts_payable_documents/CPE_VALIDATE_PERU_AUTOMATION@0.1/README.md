# Peru CPE Validation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CPE_VALIDATE_PERU_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `function`
- Savings unit: `document`

## Human active work reduced

Validate configured electronic-receipt facts against the authoritative regional source.

## Capability composition

- `CPE_VALIDATE_PERU`

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
