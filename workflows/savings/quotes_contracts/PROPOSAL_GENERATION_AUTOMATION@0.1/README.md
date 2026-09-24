# Proposal Generation

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `PROPOSAL_GENERATION_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `function`
- Savings unit: `proposal`

## Human active work reduced

Build a proposal from structured commercial inputs and templates.

## Capability composition

- `PROPOSAL_GENERATE`

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
