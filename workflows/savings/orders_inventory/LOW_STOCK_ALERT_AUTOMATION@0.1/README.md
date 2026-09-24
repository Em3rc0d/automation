# Low Stock Alert

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `LOW_STOCK_ALERT_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `scheduled`
- Savings unit: `SKU`

## Human active work reduced

Review stock levels and notify only below configured thresholds.

## Capability composition

- `LOW_STOCK_ALERT`

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
