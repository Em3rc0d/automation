# Payment Link Creation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `PAYMENT_LINK_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `function`
- Savings unit: `payment request`

## Human active work reduced

Generate and send a payment link without manual portal work.

## Capability composition

- `PAYMENT_LINK_CREATE`

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
