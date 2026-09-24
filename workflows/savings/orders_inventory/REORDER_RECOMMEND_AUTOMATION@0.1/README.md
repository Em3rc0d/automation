# Reorder Recommendation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `REORDER_RECOMMEND_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `scheduled`
- Savings unit: `SKU`

## Human active work reduced

Identify SKUs needing replenishment from configured rules.

## Capability composition

- `REORDER_RECOMMEND`

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
