# Vendor Validation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `VENDOR_VALIDATE_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `function`
- Savings unit: `invoice`

## Human active work reduced

Compare invoice vendor data against the approved vendor master.

## Capability composition

- `VENDOR_VALIDATE`

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
