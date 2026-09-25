# Lead Intake Automation

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `LEAD_INTAKE_AUTOMATION@0.1`
- Domain: `sales_leads`
- Runtime: `function`
- Savings unit: `lead`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Read inbound leads from forms/email/WhatsApp/ads and register them.

## Reference behavior

- structured inbound event
- normalize deterministic contact fields
- tenant-scoped idempotency by source event
- upsert lead record
- ProcessRecord + SavingsEvent

## Executable evidence

- code: `runtime/savings-p0/src/workflows/lead-intake.js`
- tests: `runtime/savings-p0/test/lead-intake.test.js`
- demo: `runtime/savings-p0/demo/lead-intake/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
