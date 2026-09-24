# Document Deadline Extraction

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `DOCUMENT_DEADLINE_EXTRACT_AUTOMATION@0.1`
- Domain: `documents_knowledge`
- Runtime: `heavy`
- Savings unit: `document`

## Human active work reduced

Extract important dates from documents.

## Capability composition

- `DOCUMENT_DEADLINE_EXTRACT`

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
