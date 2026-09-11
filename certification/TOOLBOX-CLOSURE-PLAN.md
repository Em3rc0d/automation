# Broad Toolbox Closure Plan

Status: **ACTIVE ROADMAP AUTHORITY**
Updated: 2026-09-11

This plan exists to close the gap between a broad designed catalog and a genuinely reusable certified toolbox.

## Current measured baseline

The machine-readable readiness reporter is the authority for live counts. At creation of this plan it reports:

- canonical SMB families: 20/20 present;
- families at least `PARTIAL`: 18/20;
- designed capability inventory: 230;
- reference archetypes designed-ready: 12/12;
- reference archetypes approved-ready: 0/12;
- `BROAD_TOOLBOX_READY`: false.

These values are not manually promoted to PASS. They must improve through evidence.

## Phase A — finish semantic coverage

The two families still below `PARTIAL` receive first priority after W11:

### HR lifecycle

Minimum closure set:
- `NEW_HIRE_VALIDATE`
- `USER_ACCOUNT_PROVISION`
- `EMPLOYEE_ONBOARDING_CHECKLIST`
- `POLICY_ACKNOWLEDGEMENT`
- `LEAVE_REQUEST`
- `LEAVE_APPROVAL`
- `OFFBOARDING_TRIGGER`
- `ACCESS_REVOKE`
- `OFFBOARDING_AUDIT`
- `EMPLOYEE_DOC_EXPIRY_ALERT`

Safety boundary: hiring decisions and sensitive employment decisions remain human-controlled. Automation handles administration, routing, scheduling, evidence and approved state transitions.

### Marketing / retention lifecycle

Minimum closure set:
- `CAMPAIGN_LEAD_CAPTURE`
- `AUDIENCE_SYNC`
- `CONTENT_APPROVAL`
- `CONTENT_SCHEDULE`
- `CAMPAIGN_REPORT`
- `FEEDBACK_REQUEST`
- `NPS_CSAT_SCORE`
- `POSITIVE_REVIEW_REQUEST`
- `RENEWAL_REMINDER`
- `REACTIVATION_CAMPAIGN`
- consent/suppression policy primitive or adapter binding

Safety/quality boundary: opt-out, consent and suppression policy must be explicit; provider/channel variants are adapters/configuration.

Phase A exits only when all 20 canonical families are at least `PARTIAL` in the coverage map.

## Phase B — deepen common composition gaps

Prioritize gaps that prevent the 12 reference archetypes from becoming production-assemblable:

1. ecommerce/order/logistics lifecycle;
2. data sync/master-data/conflict handling;
3. IT/access operations;
4. work-order/field-service/maintenance;
5. records/knowledge/RAG with evidence;
6. finance/treasury/reconciliation depth;
7. contract/e-sign/regional authority adapters.

A gap is closed by a provider-neutral capability when possible. Provider support itself is closed by adapters, not duplicate capabilities.

## Phase C — certification conversion

Designed coverage is not sufficient. Candidate capabilities must move through:

```text
DESIGNED / MINED
  -> HARDENED
  -> TESTED
  -> APPROVED_BASELINE
  -> reference-archetype assembly test
```

No reference archetype counts as approved-ready until every required business-semantic capability has approved evidence or is explicitly classified as adapter/configuration.

## Phase D — reference assembly certification

Run end-to-end assembly fixtures for the 12 canonical archetypes.

Each assembly proof must include:
- selected capability versions;
- adapter bindings;
- configuration/policy bindings;
- tenant isolation evidence;
- idempotency/replay behavior;
- failure and incident path;
- approval path where relevant;
- audit/telemetry path;
- rollback/recovery notes;
- savings/value instrumentation where meaningful.

At least 10/12 must pass before `BROAD_TOOLBOX_READY` can be claimed.

## Phase E — post-ready evolution

`BROAD_TOOLBOX_READY` does not stop mining or improvement.

After readiness:
- new common gaps may add capabilities;
- better algorithms create new versions;
- new vendors create adapters;
- new vertical/regional rules create configuration/policy modules;
- obsolete implementations may be superseded but evidence/history is preserved.

## Anti-goals

The closure plan MUST NOT be satisfied by:
- creating provider clones to raise capability count;
- splitting one semantic capability into artificial micro-capabilities;
- declaring designed artifacts as approved;
- lowering the minimum reference-archetype threshold;
- removing difficult archetypes from the policy merely to pass;
- deleting failed candidates or evidence;
- stopping the quarry after readiness.

## Completion statement

The strategic target is reached when a normal SMB requirement can usually be handled as:

```text
select certified capabilities
+ bind adapters
+ apply policy/config
+ acceptance test
+ deploy
```

rather than:

```text
invent new business workflow architecture
+ implement from scratch
```
