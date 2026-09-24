# Won Deal to Customer

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CUSTOMER_CREATE_FROM_WIN_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `function`
- Savings unit: `customer`

## Human active work reduced

Create customer records after a confirmed sale.

## Capability composition

- `CUSTOMER_CREATE_FROM_WIN`

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
