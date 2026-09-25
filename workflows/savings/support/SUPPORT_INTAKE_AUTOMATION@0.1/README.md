# Support Intake

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `SUPPORT_INTAKE_AUTOMATION@0.1`
- Domain: `support`
- Runtime: `function`
- Savings unit: `ticket`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Capture requests from email/chat/forms into a normalized support process.

## Reference behavior

- accept inbound support request
- normalize subject/body/channel
- derive stable ticket ID from source event
- upsert ticket once
- emit ticket savings unit

## Executable evidence

- code: `runtime/savings-p0/src/workflows/support-intake.js`
- tests: `runtime/savings-p0/test/support-intake.test.js`
- demo: `runtime/savings-p0/demo/support-intake/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
