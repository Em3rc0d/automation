# CASE-003 n8n trigger split — UI stability evidence

Date: 2026-09-21

## Observed failure

n8n 2.38.7 intermittently failed editor partial executions when both `Manual Gate Test` and `Daily Schedule` converged into `Reserve Due Notifications`.

Observed errors included:

```text
Cannot read properties of null (reading 'Daily Schedule')
Cannot read properties of null (reading 'Manual Gate Test')
```

Railway logs placed the failure inside n8n `runPartialWorkflow2` / `find-start-nodes.ts`, not in Supabase, the CASE-003 RPC, XLSX normalization, or the canonical snapshot.

## Remediation

The topology was split into two independent inactive workflows:

```text
case003DueDateEvaluationV1
Manual Gate Test
  -> Reserve Due Notifications
  -> Allow Newly Reserved
  -> Build Notification Payload

case003DueDateScheduleV1
Daily Schedule
  -> Reserve Due Notifications
  -> Allow Newly Reserved
  -> Build Notification Payload
```

Both reuse the same dedicated CASE-003 RPC credential and the same durable database idempotency layer.

## Railway change

Split deployment:

`8b0aa57d-67a1-4b83-b001-b8e1cc812b4e`

Verifier:

```text
PRE PASS workflows=10 credentials=5 schedule=absent manual=inactive
POST PASS workflows=11 credentials=5 manual=single-trigger schedule=single-trigger protectedState=unchanged
```

Pre-split backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T16-59-57-208Z-pre-case003-trigger-split`

SHA-256:

`d3d3611eb69775b6d320fadcf7e1b5d6b73f742929fa60526d239f136f10bd44`

Post-split backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-00-02-475Z-post-case003-trigger-split`

SHA-256:

`981cfd044c9006c699b0b23bdf50aafb0f8ad3ee2787f74226f8126974dd56da`

## Final reset

The one-shot variable `CASE003_TRIGGER_SPLIT_ON_STARTUP` was reset to `false`.

Clean reset deployment:

`3245a4f3-268f-454a-aab2-e10e2eb67ba2`

Terminal status: `SUCCESS`

Startup state:

```text
workflows=11
credentials=5
workflow seed import skipped
```

Startup backup SHA-256:

`309f7023d323dd22ad612fe5dde998709c759b9966949823adfdcf2f849c3686`

## Boundary

This remediation addresses the editor partial-execution topology issue. It does not change the Gate-4 real SAP snapshot, reservation semantics, credential contents, or outbound-delivery boundary.
