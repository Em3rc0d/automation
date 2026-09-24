# Refund Approval

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `REFUND_APPROVAL_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `human_loop`
- Savings unit: `refund`

## Human active work reduced

Route refund exceptions for approval.

## Capability composition

- `REFUND_APPROVAL`

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
