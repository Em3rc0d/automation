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
Static report integrity manifest             IMPLEMENTED
Real-pilot evidence gate                     IMPLEMENTED
Pilot intake workspace generator             IMPLEMENTED
Evidence-to-gate sync                         IMPLEMENTED
Reduced surface ADR                           ACCEPTED
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


## Reduced surface mode

ADR-0009 allows the first paying/funded pilot to use an operator-mediated static client report **only when the client explicitly agrees**. Reports carry a SHA-256 manifest and must be delivered through an access-controlled client-approved channel.

This can defer hosted Auth/RLS/UI spend, but it never waives tenant isolation, connector evidence, live execution, acceptance, backup or incident requirements.


## Real-pilot fail-closed gate

`tools/savings/mk1_gate.py` converts the remaining external MK1 requirements into one evidence specification and refuses to seal the pilot while any real-world gate is missing.

The repository example is intentionally BLOCKED. This prevents local rehearsal artifacts from being mistaken for:
- payment/funding;
- client agreement;
- provider ownership/scopes;
- real SavingsBaseline agreement;
- live execution;
- tenant isolation evidence;
- client acceptance.

See `operations/savings/MK1-REAL-PILOT-GATE.md`.


## Pilot intake workspace

`tools/savings/pilot_intake.py` now generates a zero-secret, initially BLOCKED workspace for a real pilot from the existing preflight spec. It materializes draft role model, tenant-isolation controls, per-workflow SavingsBaselines, connector authorization files, deployment decision and client acceptance checklist.

This means the first paying/funded client should require evidence collection and configuration, not new platform design.


## Evidence-to-gate sync

`tools/savings/mk1_evidence_sync.py` derives MK1 gate state from actual bundle/workspace artifacts instead of relying on manual boolean edits. Missing or incomplete evidence remains false. Funding/payment and reduced-surface client consent remain external/manual evidence by design.
