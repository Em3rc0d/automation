# Positive Review Request

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `POSITIVE_REVIEW_REQUEST_AUTOMATION@0.1`
- Domain: `feedback_retention`
- Runtime: `scheduled`
- Savings unit: `customer`

## Human active work reduced

Ask eligible satisfied customers for a public review.

## Capability composition

- `POSITIVE_REVIEW_REQUEST`

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
