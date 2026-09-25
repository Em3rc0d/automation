# Renewal Reminder

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `RENEWAL_REMINDER_AUTOMATION@0.1`
- Domain: `feedback_retention`
- Runtime: `scheduled`
- Savings unit: `contract`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Find upcoming renewals and start the renewal process.

## Reference behavior

- scan active contracts
- calculate days until renewal
- match configured reminder offsets
- send idempotently per contract/offset
- missing contact becomes exception time

## Executable evidence

- code: `runtime/savings-p0/src/workflows/renewal-reminder.js`
- tests: `runtime/savings-p0/test/renewal-reminder.test.js`
- demo: `runtime/savings-p0/demo/renewal-reminder/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
