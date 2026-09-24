# Lead SLA Watchdog

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `LEAD_SLA_WATCHDOG_AUTOMATION@0.1`
- Domain: `sales_leads`
- Runtime: `scheduled`
- Savings unit: `lead reviewed`

## Human active work reduced

Review leads with no action inside the agreed SLA.

## Capability composition

- `LEAD_FOLLOWUP_WATCHDOG`

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
