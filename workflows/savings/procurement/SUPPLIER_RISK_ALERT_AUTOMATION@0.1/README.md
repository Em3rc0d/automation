# Supplier Risk Alert

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `SUPPLIER_RISK_ALERT_AUTOMATION@0.1`
- Domain: `procurement`
- Runtime: `scheduled`
- Savings unit: `supplier`

## Human active work reduced

Check configured supplier-risk sources and alert only on relevant changes.

## Capability composition

- `SUPPLIER_RISK_ALERT`

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
