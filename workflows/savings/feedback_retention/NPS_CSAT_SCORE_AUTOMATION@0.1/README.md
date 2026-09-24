# NPS/CSAT Calculation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `NPS_CSAT_SCORE_AUTOMATION@0.1`
- Domain: `feedback_retention`
- Runtime: `function`
- Savings unit: `response`

## Human active work reduced

Calculate configured feedback metrics.

## Capability composition

- `NPS_CSAT_SCORE`

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
