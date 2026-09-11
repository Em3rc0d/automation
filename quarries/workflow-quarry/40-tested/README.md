# 40 — TESTED

Candidates here have repeatable test evidence against our hardened workflow artifact.

## Minimum test matrix

Every candidate must test, where applicable:

1. import/activation on the pinned n8n version;
2. happy path;
3. empty/missing required input;
4. malformed input;
5. duplicate event / idempotency;
6. provider timeout;
7. provider 4xx;
8. provider 5xx;
9. expired/invalid credential;
10. retry/backoff behavior;
11. destructive side-effect guard;
12. approval-required branch;
13. tenant/config isolation;
14. ProcessRecord output;
15. ExecutionEvent emission;
16. Incident creation on terminal failure;
17. Savings metrics correctness;
18. PII/log redaction;
19. no credentials/secrets in exported artifact;
20. rollback/disable path.

## Evidence layout

```text
40-tested/<candidate-id>/
├── workflow.json
├── manifest.yaml
├── README.md
├── fixtures/
└── evidence/
    ├── TEST-REPORT.md
    ├── sample-inputs/
    └── sample-outputs/
```

Never commit real customer PII or secrets as test evidence.

## Test result semantics

- `PASS`: all mandatory tests passed or a non-applicable test is explicitly justified.
- `FAIL`: one or more mandatory tests failed.
- `NOT_RUN`: cannot be promoted.

## Exit gate → APPROVED_BASELINE

A maintainer verifies:
- test evidence matches the exact workflow artifact/hash;
- no unresolved HIGH severity finding exists;
- documented limitations are acceptable for the intended baseline;
- provenance/license obligations remain attached.
