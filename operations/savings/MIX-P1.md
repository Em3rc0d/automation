# MIX-P1 — Pilot Evidence + Plug-in Factory

Status: **ACTIVE OPERATING PLAN**  
Updated: 2026-09-26

## Objective

Use the repository in two directions at the same time without confusing internal engineering evidence with market evidence.

```text
                         MIX-P1
                           |
              +------------+------------+
              |                         |
        REAL PILOT 65%             FACTORY 35%
              |                         |
     discovery + baseline        selective P1 workflows
     real connectors             zero-deps/shared runtime
     controlled live run         deterministic tests
     client acceptance           package/evidence gates
              |                         |
              +------------+------------+
                           |
                 reusable paid outcome
```

## Track A — first real MYPE pilot

Start from the existing approved P0 library and delivery presets. Do not wait for P1.

Sequence:

1. Identify one MYPE with a repetitive process and an owner willing to measure it.
2. Run discovery under `commercial/AUTOMATION-DISCOVERY.md`.
3. Prefer **two workflows**, three only when the process is clearly coupled.
4. Build the pilot spec and run `tools/savings/launch_pilot.py`.
5. Keep the fresh gate BLOCKED.
6. Bind client-owned/provider-approved accounts.
7. Verify scopes and tenant ownership.
8. Agree the measured SavingsBaseline.
9. Run controlled live executions.
10. Capture failures/exceptions, variable cost and human oversight.
11. Sync evidence with `mk1_evidence_sync.py`.
12. Obtain explicit client acceptance before sealing.

### Preferred initial offers

- Services/agencies: Lead Intake + Lead Follow-up; optionally Quote Follow-up.
- Workshop/technical service: Appointment Reminder + Payment Reminder.
- Academy/training: Appointment Reminder + Payment Reminder or Renewal Reminder.
- Backoffice: Email Classify/Route + Attachment Extract or Document Archive.

These are starting hypotheses, not mandatory packages.

## Track B — P1 plug-in factory

Implement only workflows selected in `w-savings-p1/SELECTED-WORKFLOWS.json`.

First tranche:

```text
LEAD_SLA_WATCHDOG_AUTOMATION
APPOINTMENT_CONFIRM_AUTOMATION
PAYMENT_RECONCILIATION_AUTOMATION
```

Each must preserve:
- provider-neutral contracts;
- idempotent side effects;
- tenant-scoped inputs/adapters;
- bounded retry/error semantics;
- ProcessRecord + ExecutionEvent + SavingsEvent compatibility;
- deterministic local fixtures;
- no paid infrastructure requirement for tests;
- independent HARDENED / TESTED / APPROVED_BASELINE gates.

## Feedback bridge

After every real pilot discovery or controlled execution, record whether a missing workflow is:

```text
ONE_CLIENT_CUSTOM
REUSABLE_GAP
EXISTING_BASELINE_CONFIG_GAP
CONNECTOR_GAP
PROCESS_DESIGN_PROBLEM
```

Only `REUSABLE_GAP` should normally reprioritize the factory registry.

## Stop conditions

Do not:
- build a dedicated server/project merely because a prospect exists;
- mark a design skeleton as production ready;
- claim cash savings from released capacity;
- create a client-specific workflow when configuration/composition solves it;
- continue factory expansion indefinitely while a qualified real pilot is waiting.

## Exit condition

MIX-P1 is successful when both are true:

1. At least one real MYPE has reached controlled live execution with a measured baseline and explicit acceptance path.
2. At least three P1 candidates have executable references and can enter the normal factory certification lifecycle.

The two tracks are deliberately coupled: the pilot tells the factory what is worth standardizing; the factory reduces delivery time for the next pilot.
