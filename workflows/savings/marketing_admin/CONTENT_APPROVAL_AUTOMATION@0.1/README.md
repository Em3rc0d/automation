# Content Approval

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `CONTENT_APPROVAL_AUTOMATION@0.1`
- Domain: `marketing_admin`
- Runtime: `human_loop`
- Savings unit: `content item`

## Human active work reduced

Route scheduled content for configured approval.

## Capability composition

- `CONTENT_APPROVAL`

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
