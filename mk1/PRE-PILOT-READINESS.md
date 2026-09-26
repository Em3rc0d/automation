# MK1 Pre-Pilot Readiness Gate

Status: **CANDIDATE / NOT P1 CERTIFICATION**

This gate proves everything the repository can reasonably prove **before a real paying/funded client exists**, without fabricating tenant credentials, OAuth consent, live provider evidence or client approval.

## Repository-side criteria

```text
[ ] 12 Savings Workflows are APPROVED_BASELINE
[ ] zero-deps-node-v1 is FACTORY-CERTIFIED
[ ] approved installation kit exists
[ ] local approved-code runner exists
[ ] Google Workspace provider pack exists
[ ] live connector verification runner exists
[ ] live execution runner exists
[ ] persistent local idempotency/audit runtime exists
[ ] cron + event-spool deployment exists
[ ] protected hashed client-acceptance evidence exists
[ ] two-workflow MK1 local rehearsal passes
[ ] static client/operator rehearsal surface + hash manifest passes
[ ] local bundle backup/restore tests pass
[ ] local fail-safe incident/repair drill passes
[ ] MYPE pilot presets + discovery bootstrap exist
[ ] ADR-0007 pre-revenue zero-cost invariant is present
[ ] ADR-0009 reduced first-pilot surface is present
[ ] repository certification remains green
```

## What a PASS means

A PASS means the remaining blockers are **external/client-specific or production-account specific**, not missing baseline workflow machinery.

A PASS does **not** mean:

- a real tenant exists;
- Google OAuth is authorized;
- provider scopes are verified for a customer;
- a client SavingsBaseline has been measured/agreed;
- live side effects have been accepted;
- CLIENT_CONFIGURED or CLIENT_ACCEPTED exists;
- P1/MK1 is certified.

## Remaining real-pilot gates

```text
REAL PAYING/FUNDED PILOT
→ tenant + users/reduced role agreement
→ real provider binding
→ OAuth/scope healthcheck
→ client-measured baseline
→ two workflows configured to actual process
→ controlled live run
→ evidence review
→ client approval
→ production backup/restore
→ live-provider incident drill
→ deployment/rollback acceptance
→ CLIENT_ACCEPTED
→ P1 evidence review
```

The gate exists to prevent the team from buying infrastructure or building unrelated product scope merely to feel "ready".
