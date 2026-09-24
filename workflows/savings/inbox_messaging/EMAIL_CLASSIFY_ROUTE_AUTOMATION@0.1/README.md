# Email Classification and Routing

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `EMAIL_CLASSIFY_ROUTE_AUTOMATION@0.1`
- Domain: `inbox_messaging`
- Runtime: `function`
- Savings unit: `email`

## Human active work reduced

Classify and route incoming email automatically.

## Capability composition

- `EMAIL_CLASSIFY_ROUTE`

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
