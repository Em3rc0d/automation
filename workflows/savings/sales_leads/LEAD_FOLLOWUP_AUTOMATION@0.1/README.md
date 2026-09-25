# Lead Follow-up

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `LEAD_FOLLOWUP_AUTOMATION@0.1`
- Domain: `sales_leads`
- Runtime profile: `durable`
- Savings unit: `follow-up`

## Human active work reduced

Review pending leads and send configured follow-ups.

## Reference durable model

The reference does not keep a server sleeping for days. Sequence progress is persisted on the lead record and a cheap scheduled tick resumes the next due stage.

```text
lead source
→ open/consent guard
→ persistent completedStages
→ due-stage calculation
→ minimum-spacing guard
→ idempotent message
→ persist stage progress
→ ProcessRecord + SavingsEvent
```

- Code: `runtime/savings-p0/src/workflows/lead-followup.js`
- Tests: `runtime/savings-p0/test/lead-followup.test.js`
- Demo: `runtime/savings-p0/demo/lead-followup/run.js`

This proves a durable business sequence without an always-on per-tenant process.
