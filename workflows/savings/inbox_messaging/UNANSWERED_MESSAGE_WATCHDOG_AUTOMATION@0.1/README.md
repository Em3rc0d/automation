# Unanswered Message Watchdog

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION@0.1`
- Domain: `inbox_messaging`
- Runtime: `scheduled`
- Savings unit: `thread`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Find conversations with no response inside SLA.

## Reference behavior

- scan tenant message threads
- ignore closed/already-answered threads
- compare inbound age to SLA
- alert owner once per inbound message
- missing owner contact becomes exception time

## Executable evidence

- code: `runtime/savings-p0/src/workflows/unanswered-message-watchdog.js`
- tests: `runtime/savings-p0/test/unanswered-message-watchdog.test.js`
- demo: `runtime/savings-p0/demo/unanswered-message-watchdog/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
