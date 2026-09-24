# Anomaly Review Queue

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `ANOMALY_REVIEW_AUTOMATION@0.1`
- Domain: `reporting`
- Runtime: `scheduled`
- Savings unit: `metric check`

## Human active work reduced

Surface anomalous cases for human review instead of manual scanning.

## Capability composition

- `ANOMALY_REVIEW`

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
