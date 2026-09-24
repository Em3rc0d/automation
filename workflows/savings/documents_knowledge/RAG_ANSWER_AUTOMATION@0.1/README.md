# Knowledge Q&A with Evidence

Status: **DESIGN_READY / NOT IMPLEMENTED / NOT CERTIFIED**

- Key: `RAG_ANSWER_AUTOMATION@0.1`
- Domain: `documents_knowledge`
- Runtime: `function`
- Savings unit: `query`

## Human active work reduced

Retrieve an answer with source evidence instead of manual document search.

## Capability composition

- `RAG_ANSWER_WITH_EVIDENCE`

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
