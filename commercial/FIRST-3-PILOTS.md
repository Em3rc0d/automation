# First 3 MYPE Pilots

Status: **COMMERCIAL / DELIVERY PLAYBOOK**  
Updated: 2026-09-26

The first three clients are evidence-building pilots, not excuses to build three bespoke products.

## Client 1 — learn

Goal: prove one narrow outcome end to end.

Recommended scope:
- one real process owner;
- two Savings Workflows;
- one primary system of record;
- one messaging/calendar/provider path where possible;
- measured AS-IS baseline;
- controlled live execution;
- explicit exception path.

Success evidence:
- actual units processed;
- automated units;
- exception minutes;
- oversight minutes;
- provider variable cost;
- hours of capacity released;
- client acceptance notes;
- what had to be configured versus newly built.

## Client 2 — standardize

Goal: reuse the first delivery pattern with another MYPE.

Before accepting new development, ask:
1. Can an APPROVED_BASELINE solve it?
2. Can two approved workflows be composed?
3. Is the gap only provider mapping/configuration?
4. Is the requested exception unique to this client?

Success evidence:
- reused workflow versions;
- reused connector roles;
- installation time versus Client 1;
- configuration changes;
- truly new reusable gaps.

## Client 3 — repeatability

Goal: demonstrate a repeatable offer and produce a defensible case study.

The case study may state:
- process before/after;
- baseline methodology and confidence;
- measured automated units;
- released hours;
- operating cost;
- exception rate;
- implementation time.

It must not convert estimated capacity into claimed payroll cash savings unless the client has evidence for that claim.

## Commercial guardrails

Use the pricing hypotheses already documented in `commercial/CATALOG.md` as hypotheses to validate, not fixed price guarantees.

For every pilot separate:
- implementation/service fee;
- recurring monitoring/support;
- external provider/API/WhatsApp/AI cost;
- client-owned subscriptions/accounts.

No persistent paid infrastructure should be provisioned only to make the company look production-ready before the pilot needs it.

## Pilot qualification

A useful first pilot has:
- repetitive human work happening every week;
- enough volume to measure;
- a reachable process owner;
- a source of truth the team can access legitimately;
- a tolerable side-effect risk;
- a workflow fit with the current APPROVED_BASELINE library;
- willingness to validate the baseline and acceptance criteria.

A prospect is a poor first pilot when the main request is a broad custom ERP, a generic chatbot, heavy regulated decisions, or a process whose business rules are still unknown.

## Handoff to the repository

Once qualified:

```bash
python tools/savings/pilot_bootstrap.py plan --spec <pilot-spec.json>
python tools/savings/launch_pilot.py --spec <pilot-spec.json>
```

The workspace must remain BLOCKED until real connector, baseline, live-run, isolation and acceptance evidence exists.
