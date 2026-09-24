# Quote Exception Approval

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `QUOTE_APPROVAL_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `human_loop`
- Savings unit: `approval`

## Human active work reduced

Detect discount/margin exceptions and route approval.

## Capability composition

- `QUOTE_APPROVAL`
- `APPROVAL_REQUEST`

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
