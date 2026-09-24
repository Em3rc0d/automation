# Supplier Invoice Status Self-service

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `SUPPLIER_INVOICE_STATUS_AUTOMATION@0.1`
- Domain: `supplier_self_service`
- Runtime: `function`
- Savings unit: `query`

## Human active work reduced

Look up invoice status and answer the supplier without back-office lookup.

## Capability composition

- `ENTITY_SYNC_ONE_WAY`

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
