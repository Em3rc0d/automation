# MK1 Status

Updated: 2026-09-25

Status: **PRE-PILOT / ZERO-COST REHEARSAL READY / NOT CERTIFIED**

## Repository-proven before a real client

```text
Approved low-cost Savings baselines       12/12
Factory-certified zero-deps runtime        YES
Zero-cost installation bundles             YES
Local execution of approved workflow code  YES
Google Workspace connector pack            PRODUCTION_CANDIDATE
Live connector verification/runtime        IMPLEMENTED
Local scheduler + event spool               IMPLEMENTED
Hashed client-acceptance evidence gate      IMPLEMENTED
Two-workflow MK1 rehearsal                  IMPLEMENTED
Static client/operator demo surfaces          IMPLEMENTED
PostgreSQL shared-table RLS control plane      IMPLEMENTED / EPHEMERAL-CI
Bundle backup/restore rehearsal             IMPLEMENTED
Incident failure/repair rehearsal           IMPLEMENTED
Paid infrastructure required for rehearsal NO
```

## Rehearsal scope

`mk1/rehearsal/` installs and executes Payment Reminder + Appointment Reminder for a synthetic tenant, projects client/operator views, calculates Savings Engine results and verifies that `CLIENT_CONFIGURED` remains blocked without real connector verification.

## Real pilot gates that remain

```text
[ ] real paying/funded pilot identified
[ ] real tenant/users/role model agreed
[ ] real provider account bound
[ ] real OAuth/scopes verified
[ ] client-measured SavingsBaseline agreed
[ ] two selected workflows configured for that client's process
[ ] controlled live execution evidence
[ ] explicit client acceptance evidence
[ ] agreed client/operator UI surface available
[ ] RLS/isolation evidence for production control plane
[x] local bundle backup/restore test
[ ] production control-plane backup/restore test
[x] local runtime incident drill
[ ] live-provider incident drill
[ ] production deployment/rollback approved
```

Do not mark P1/MK1 certified until those real-world gates are evidenced.


## Static local HTML

The rehearsal JSON projections can render to dependency-free local Client Portal and Operator Console HTML. This closes the **demo/presentation** portion of the UI gap without adding hosting cost.

Production auth, RLS and persistence remain real pilot/product gates.


## Control-plane RLS evidence

`control-plane/postgres/` now implements the MK1 shared-table control-plane contract and validates it in ephemeral PostgreSQL 16.

The gate proves:
- explicit `tenant_id` across tenant-owned domain data;
- RLS enabled on all tenant-owned control-plane tables;
- negative cross-tenant reads for authenticated users;
- browser read-only behavior;
- technical execution/audit tables withheld from the browser role;
- cross-tenant composite-FK protection;
- trusted backend/service-role boundary.

This advances the RLS/isolation gate structurally without opening a paid Supabase project. A funded pilot must still prove the same behavior with real Auth/users and the selected production deployment.
