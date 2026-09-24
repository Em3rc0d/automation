# Post-class Material Delivery

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CLASS_MATERIAL_DELIVERY_AUTOMATION@0.1`
- Domain: `education`
- Runtime: `durable`
- Savings unit: `class`

## Human active work reduced

Send the correct material to the correct group after class.

## Capability composition

- `DOCUMENT_ROUTE_FOLDER`

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
