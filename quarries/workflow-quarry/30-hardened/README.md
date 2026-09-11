# 30 — HARDENED

Candidates here have been adapted from an external/example workflow into our operational standards.

## Required hardening

- no credentials/secrets embedded in JSON;
- no hardcoded client identifiers;
- tenant-specific values moved to config;
- stable input normalization;
- explicit idempotency strategy;
- safe retry/backoff policy;
- failure → Incident mapping;
- `ExecutionEvent` telemetry;
- `ProcessRecord` creation/update where applicable;
- Savings Engine units/cost metrics where applicable;
- `ApprovalRequest` / human-in-the-loop for sensitive actions;
- official provider APIs for production paths unless an exception is documented;
- PII redaction from operational logs;
- rollback/disable behavior documented;
- provider/version assumptions documented;
- required connectors and scopes documented.

## Required output shape

A hardened candidate must have:

```text
workflow.json
manifest.yaml
README.md
fixtures/
```

`README.md` explains setup, configuration, side effects, limitations and rollback.

## Exit gate → TESTED

The hardened artifact imports cleanly into the pinned n8n version and has a repeatable test plan with fixtures.
