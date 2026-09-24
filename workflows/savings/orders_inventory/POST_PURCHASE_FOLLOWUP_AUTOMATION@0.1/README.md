# Post-purchase Follow-up

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `POST_PURCHASE_FOLLOWUP_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `scheduled`
- Savings unit: `order`

## Human active work reduced

Send configured follow-up after delivery.

## Capability composition

- `POST_PURCHASE_FOLLOWUP`

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
