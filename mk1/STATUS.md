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
[ ] backup/restore test
[ ] incident drill
[ ] production deployment/rollback approved
```

Do not mark P1/MK1 certified until those real-world gates are evidenced.
