# Deposit Request

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `DEPOSIT_REQUEST_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `function`
- Savings unit: `deposit`

## Human active work reduced

Create and send the configured deposit request.

## Capability composition

- `DEPOSIT_REQUEST`

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
