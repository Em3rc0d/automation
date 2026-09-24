# Contract Review Gate

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CONTRACT_REVIEW_GATE_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `human_loop`
- Savings unit: `contract`

## Human active work reduced

Route contracts that require human/legal review.

## Capability composition

- `CONTRACT_REVIEW_GATE`
- `APPROVAL_REQUEST`

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
