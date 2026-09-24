# Invoice Approval Routing

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `INVOICE_APPROVAL_ROUTE_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `human_loop`
- Savings unit: `invoice`

## Human active work reduced

Find the correct approver and route only exceptions.

## Capability composition

- `INVOICE_APPROVAL_ROUTE`

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
