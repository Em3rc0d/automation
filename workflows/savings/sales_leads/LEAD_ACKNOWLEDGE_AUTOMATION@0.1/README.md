# Immediate Lead Acknowledgement

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `LEAD_ACKNOWLEDGE_AUTOMATION@0.1`
- Domain: `sales_leads`
- Runtime: `function`
- Savings unit: `lead`

## Human active work reduced

Write and send the first acknowledgement to a new lead.

## Capability composition

- `LEAD_ACKNOWLEDGE`

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
