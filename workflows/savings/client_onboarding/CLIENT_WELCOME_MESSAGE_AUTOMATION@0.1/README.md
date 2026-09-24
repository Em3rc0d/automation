# Client Welcome Message

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CLIENT_WELCOME_MESSAGE_AUTOMATION@0.1`
- Domain: `client_onboarding`
- Runtime: `function`
- Savings unit: `client`

## Human active work reduced

Send the standard welcome packet/message.

## Capability composition

- `CLIENT_WELCOME_MESSAGE`

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
