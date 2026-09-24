# Support Knowledge Lookup

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `KB_RETRIEVE_AUTOMATION@0.1`
- Domain: `support`
- Runtime: `function`
- Savings unit: `query`

## Human active work reduced

Retrieve relevant approved knowledge for a support request.

## Capability composition

- `KB_RETRIEVE`

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
