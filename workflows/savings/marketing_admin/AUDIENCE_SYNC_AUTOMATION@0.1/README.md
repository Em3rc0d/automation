# Audience Sync

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `AUDIENCE_SYNC_AUTOMATION@0.1`
- Domain: `marketing_admin`
- Runtime: `scheduled`
- Savings unit: `contact`

## Human active work reduced

Synchronize approved audiences between systems.

## Capability composition

- `AUDIENCE_SYNC`

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
