# Data Quality Check

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `DATA_QUALITY_CHECK_AUTOMATION@0.1`
- Domain: `data_sync_it`
- Runtime: `scheduled`
- Savings unit: `record set`

## Human active work reduced

Run recurring completeness/consistency checks.

## Capability composition

- `DATA_QUALITY_CHECK`

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
