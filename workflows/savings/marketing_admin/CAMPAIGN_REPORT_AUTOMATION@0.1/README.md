# Campaign Report

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CAMPAIGN_REPORT_AUTOMATION@0.1`
- Domain: `marketing_admin`
- Runtime: `scheduled`
- Savings unit: `report`

## Human active work reduced

Compile campaign metrics automatically.

## Capability composition

- `CAMPAIGN_REPORT`

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
