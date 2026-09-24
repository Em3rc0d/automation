# Bidirectional Entity Sync

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `ENTITY_SYNC_BIDIRECTIONAL_AUTOMATION@0.1`
- Domain: `data_sync_it`
- Runtime: `durable`
- Savings unit: `entity`

## Human active work reduced

Synchronize approved fields in both directions.

## Capability composition

- `ENTITY_SYNC_BIDIRECTIONAL`

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
