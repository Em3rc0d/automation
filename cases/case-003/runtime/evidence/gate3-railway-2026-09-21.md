# CASE-003 Gate 3 — Railway reservation evidence

Date: 2026-09-21

Scope: move durable notification reservation into the real inactive n8n execution path, execute the same due-date rule twice, and prove that the second execution is blocked before any delivery payload. No WhatsApp or other outbound channel node was present.

## Database migration

Applied the portable schema represented by:

`build/gate3-reservation-rpc.sql`

Runtime functions:

- `case003.reserve_due_candidates(integer,text)` — runtime-independent PostgreSQL reservation core.
- `public.case003_reserve_due_candidates(integer,text)` — authenticated Supabase/PostgREST wrapper.
- `case003.reserve_due_notification(...)` — durable unique-key reservation primitive.

The reservation primitive has a fixed function search path `pg_catalog, case003, extensions`.

The Railway proof used the probe rule:

`due_3d_gate3_v1`

This avoids deleting or rewriting the historical synthetic `due_3d` reservation from earlier G2.1 testing. Rule code is part of the idempotency key.

## Gate-3 workflow binding

Binding deployment:

`eb482657-4fa4-4e48-a1df-a78cea53aca2`

Terminal status:

`SUCCESS`

Pre-bind backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T15-14-57-228Z-pre-case003-gate3-bind`

Pre-bind SHA-256:

`234d49d685db3367e37e2910c757775ed3c3eccc0da2d9cf771de51702bb774c`

Verifier:

```text
PRE PASS workflows=10 credentials=5 CASE003=inactive credential=reused
POST PASS workflows=10 credentials=5 existingState=unchanged CASE003=inactive reservationPath=bound
```

Post-bind backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T15-15-01-393Z-post-case003-gate3-bind`

Post-bind SHA-256:

`3a822adcc1fb4ea81a653a1d56f758e8ba7d5c299ab880d515ded8e4e3421178`

No credential was created or edited. The existing dedicated `case003RpcAuthV1` credential was reused.

## Double execution proof

Test deployment:

`b760d960-a443-412a-8049-e87e98381411`

Terminal status:

`SUCCESS`

Pre-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T15-16-44-843Z-pre-case003-gate3-test`

Pre-test SHA-256:

`3a822adcc1fb4ea81a653a1d56f758e8ba7d5c299ab880d515ded8e4e3421178`

Execution checkpoint before test:

`latestCliExecutionId=92`

### First execution

```text
executionId=93
invoice=F001-100
reserved=true
notificationId=ccfc13fa-d1a6-4c61-a55d-a425b77d1e22
```

The newly reserved item passed `Allow Newly Reserved` and reached `Build Notification Payload`. No outbound channel node exists after that point.

### Second execution

```text
executionId=94
invoice=F001-100
reserved=false
duplicateBlocked=true
notificationId=ccfc13fa-d1a6-4c61-a55d-a425b77d1e22
```

The second execution returned the same durable notification identity, `reserved=false`, and produced zero items after the idempotency filter.

Post-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T15-16-53-709Z-post-case003-gate3-test`

Post-test SHA-256:

`506ee10e80c798bf3bf944516e8eb88b0b0667df7d6fd4b56ee9038441f13476`

Post-test state:

```text
workflows=10
credentials=5
users=1
CASE-003 active=false
```

## PostgreSQL ledger evidence

Exactly one Gate-3 probe reservation exists for the synthetic invoice:

```text
notification_id = ccfc13fa-d1a6-4c61-a55d-a425b77d1e22
tenant_id       = 30000000-0000-0000-0000-000000000000
invoice_id      = 30000000-0000-0000-0000-000000000100
rule_code       = due_3d_gate3_v1
canonical_due   = 2026-09-24
snapshot_id     = 30000000-0000-0000-0000-000000000001
idempotency_key = 89474fef36705f589cd8847c43e437a80cd6e9448d01e59ad1c584886abd6eff
status          = reserved
```

Two n8n executions therefore produced one durable notification row.

## Gate reset

After the successful proof, `CASE003_GATE3_TEST_ON_STARTUP` was reset to `false`.

Reset deployment:

`fb80a7f8-d7a0-47fc-a631-38e65ad302b4`

Terminal status:

`SUCCESS`

Reset startup backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T15-17-42-335Z-startup`

SHA-256:

`506ee10e80c798bf3bf944516e8eb88b0b0667df7d6fd4b56ee9038441f13476`

Reset evidence:

```text
workflows=10
credentials=5
[case002] skipping workflow import; preserving persisted n8n state
[case002] bootstrap complete; starting n8n
```

This confirms the one-shot Gate-3 test is disabled and the persistent state survived restart.

## Post-proof database hardening

After the execution proof:

- the search path of `case003.reserve_due_notification(...)` was pinned to `pg_catalog, case003, extensions`;
- unnecessary `authenticated` execution grants were revoked from the two CASE-003 public RPC functions; the Railway path uses the publishable/anon API role plus the independent `x-case003-token` guard;
- covering indexes were added for `notification_delivery.invoice_id` and `notification_delivery.snapshot_id`.

Supabase performance advisor no longer reports unindexed foreign keys for CASE-003 notification delivery. The remaining CASE-003 security-advisor warning is the intentional anonymous-callable `SECURITY DEFINER` RPC surface; both CASE-003 RPC functions independently validate the additional integration token before returning or reserving data.

## Certification boundary

Gate 3 certifies:

```text
ACTIVE canonical due candidate
 -> authenticated CASE-003 n8n call
 -> durable DB reservation
 -> first execution reserved=true
 -> delivery payload allowed
 -> second execution same key reserved=false
 -> duplicate blocked before delivery payload
```

It does not certify supplier-facing WhatsApp delivery or final SAP/bank payment semantics. `payment_status_evidence=UNKNOWN` remains evidence-only and must not be described as a certified unpaid status.
