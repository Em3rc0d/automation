# Shipping Tracking Sync

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `SHIPPING_TRACK_SYNC_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `scheduled`
- Savings unit: `shipment`

## Human active work reduced

Poll/receive carrier state and update customer/order records.

## Capability composition

- `SHIPPING_TRACK_SYNC`

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
