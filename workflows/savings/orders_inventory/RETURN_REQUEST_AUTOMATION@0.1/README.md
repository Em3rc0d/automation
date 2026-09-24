# Return Request Intake

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `RETURN_REQUEST_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `function`
- Savings unit: `return`

## Human active work reduced

Register and validate a return request.

## Capability composition

- `RETURN_REQUEST`

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
