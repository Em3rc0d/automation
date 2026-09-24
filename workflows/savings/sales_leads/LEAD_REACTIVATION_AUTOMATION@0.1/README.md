# Dormant Lead Reactivation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `LEAD_REACTIVATION_AUTOMATION@0.1`
- Domain: `sales_leads`
- Runtime: `scheduled`
- Savings unit: `lead`

## Human active work reduced

Find dormant/lost leads and re-engage them under policy.

## Capability composition

- `LEAD_REACTIVATE`

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
