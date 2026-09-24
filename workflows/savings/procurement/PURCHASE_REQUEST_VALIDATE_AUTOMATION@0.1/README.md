# Purchase Request Validation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `PURCHASE_REQUEST_VALIDATE_AUTOMATION@0.1`
- Domain: `procurement`
- Runtime: `function`
- Savings unit: `request`

## Human active work reduced

Check required fields and documents.

## Capability composition

- `PURCHASE_REQUEST_VALIDATE`

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
