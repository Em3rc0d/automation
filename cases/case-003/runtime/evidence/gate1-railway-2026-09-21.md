# CASE-003 Gate 1 — Railway evidence

Date: 2026-09-21

Scope: additive import of one inactive CASE-003 workflow into the existing production n8n service. No existing workflow or credential was edited or deleted.

## Deployment

Gate deployment: `a4ca1cef-4a24-4497-a5fc-3bf6c92099d5`

Terminal status: `SUCCESS`

n8n version: `2.38.7`

## Pre-import checkpoint

Backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T12-57-14-848Z-pre-case003-import`

SHA-256:

`383516a377ccd07d3b0804c01e12ed5bf06d8d26d662a64d6ac4672722c900c7`

Verified state:

```text
workflows=9
credentials=4
users=1
target workflow=absent
```

Verifier evidence:

`[case003-verify] PRE PASS workflows=9 credentials=4 target=absent`

## Post-import checkpoint

Imported workflow:

- ID: `case003DueDateEvaluationV1`
- Name: `CASE-003 Due Date Evaluation`
- Active: `false`

Backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T12-57-18-861Z-post-case003-import`

SHA-256:

`f456ef7f036499855eb23942546a8c39acc9235ed29bebd2ec2a070e8399d0b1`

Verified state:

```text
workflows=10
credentials=4
users=1
```

Verifier evidence:

`[case003-verify] POST PASS workflows=10 credentials=4 target=case003DueDateEvaluationV1 active=false`

## One-shot gate

The environment variable `CASE003_DUE_DATE_IMPORT_ON_STARTUP` was set to `true` only for this import deployment and then immediately reset to `false`.

This evidence certifies Gate 1 only: additive inactive workflow import with unchanged credential count and consistent before/after SQLite backups. It does not certify database connectivity or workflow execution.
