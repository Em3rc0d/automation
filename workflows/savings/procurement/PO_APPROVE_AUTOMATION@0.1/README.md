# Purchase Order Approval

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `PO_APPROVE_AUTOMATION@0.1`
- Domain: `procurement`
- Runtime: `human_loop`
- Savings unit: `purchase order`

## Human active work reduced

Route high-risk/high-value PO approval.

## Capability composition

- `PO_APPROVE`

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
