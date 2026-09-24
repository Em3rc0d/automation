# Client Initial Invoice

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CLIENT_INITIAL_INVOICE_AUTOMATION@0.1`
- Domain: `client_onboarding`
- Runtime: `function`
- Savings unit: `client`

## Human active work reduced

Create the initial billing action after onboarding gates pass.

## Capability composition

- `CLIENT_INITIAL_INVOICE`

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
