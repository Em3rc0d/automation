# Email Classification and Routing

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `EMAIL_CLASSIFY_ROUTE_AUTOMATION@0.1`
- Domain: `inbox_messaging`
- Runtime: `function`
- Savings unit: `email`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Classify and route incoming email automatically.

## Reference behavior

- accept structured email
- evaluate deterministic keyword/domain rules
- fall back to general queue
- persist category/queue decision
- emit one email savings unit

## Executable evidence

- code: `runtime/savings-p0/src/workflows/email-classify-route.js`
- tests: `runtime/savings-p0/test/email-classify-route.test.js`
- demo: `runtime/savings-p0/demo/email-classify-route/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
