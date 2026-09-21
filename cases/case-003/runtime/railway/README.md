# CASE-003 on Railway (reuse existing n8n)

This target intentionally reuses an existing Linux n8n service and persistent volume. It does not create a new Railway project or service.

## Required live-runtime assets

The n8n image must contain:

- `/opt/case002/case003-due-date-evaluation.json`
- `/opt/case002/verify-case003-import.js`
- `/opt/case002/backup-n8n-state.js`

The startup entrypoint owns the one-shot gate.

## Gate 1

Set only:

```text
CASE003_DUE_DATE_IMPORT_ON_STARTUP=true
CASE003_EXPECTED_PRE_WORKFLOWS=9
CASE003_EXPECTED_PRE_CREDENTIALS=4
```

For the current production environment the expected values are embedded as safe defaults in the verifier. Explicit variables are recommended when reproducing in another existing n8n instance.

Expected startup evidence:

```text
[case002-backup] ... workflows=9 credentials=4
[case003-verify] PRE PASS workflows=9 credentials=4 target=absent
...
[case003-verify] POST PASS workflows=10 credentials=4 target=case003DueDateEvaluationV1 active=false
[case002-backup] ... workflows=10 credentials=4
```

After terminal deployment status `SUCCESS`, immediately set:

```text
CASE003_DUE_DATE_IMPORT_ON_STARTUP=false
```

and verify the subsequent deployment reaches `SUCCESS`. The verifier intentionally refuses a second additive import because the workflow ID already exists.

## Recovery

If Gate 1 fails, do not delete or edit existing workflows/credentials. Use the most recent `pre-case003-import` backup for investigation/recovery.

## Secrets

No database passwords, Supabase service-role keys, n8n encryption keys, or credential payloads belong in this repository.
