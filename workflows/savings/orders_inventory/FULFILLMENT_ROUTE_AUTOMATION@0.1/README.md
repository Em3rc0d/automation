# Fulfillment Routing

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `FULFILLMENT_ROUTE_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `function`
- Savings unit: `order`

## Human active work reduced

Assign the order to the correct warehouse/team.

## Capability composition

- `FULFILLMENT_ROUTE`

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
