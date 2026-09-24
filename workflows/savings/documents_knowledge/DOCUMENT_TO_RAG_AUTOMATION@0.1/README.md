# Knowledge Ingestion

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `DOCUMENT_TO_RAG_AUTOMATION@0.1`
- Domain: `documents_knowledge`
- Runtime: `heavy`
- Savings unit: `document`

## Human active work reduced

Prepare approved documents for searchable knowledge retrieval.

## Capability composition

- `DOCUMENT_TO_RAG`

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
