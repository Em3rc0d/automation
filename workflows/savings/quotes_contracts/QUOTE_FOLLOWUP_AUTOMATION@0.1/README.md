# Quote Follow-up

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `QUOTE_FOLLOWUP_AUTOMATION@0.1`
- Domain: `quotes_contracts`
- Runtime: `scheduled`
- Savings unit: `quote`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Review pending quotes and contact customers on schedule.

## Reference behavior

- scan pending quotes
- skip accepted/rejected/expired quotes
- calculate due follow-up stage
- enforce minimum spacing
- send idempotently and persist completed stage

## Executable evidence

- code: `runtime/savings-p0/src/workflows/quote-followup.js`
- tests: `runtime/savings-p0/test/quote-followup.test.js`
- demo: `runtime/savings-p0/demo/quote-followup/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
