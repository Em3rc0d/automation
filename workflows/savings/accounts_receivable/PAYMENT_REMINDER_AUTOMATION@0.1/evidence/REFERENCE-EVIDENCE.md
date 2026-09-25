# Payment Reminder — Reference Runtime Evidence

Status: **REFERENCE EVIDENCE / NOT CANONICAL TESTED / NOT APPROVED_BASELINE**

Reference runtime: `zero-deps-node-v1`.

## Executable artifacts

- runtime core: `runtime/savings-p0/src/runtime.js`
- workflow: `runtime/savings-p0/src/workflows/payment-reminder.js`
- table adapter: `runtime/savings-p0/src/adapters/memory-table.js`
- message adapter: `runtime/savings-p0/src/adapters/memory-message.js`
- tests: `runtime/savings-p0/test/payment-reminder.test.js`
- shared runtime tests: `runtime/savings-p0/test/runtime.test.js`, `runtime/savings-p0/test/retry.test.js`
- deterministic demo: `runtime/savings-p0/demo/payment-reminder/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

## Current suite note

The original package note recorded 13/13 tests when Payment Reminder was first authored. The shared W-SAVINGS-P0 suite has since expanded; canonical test counts come from the exact CI evidence SHA used for TESTED promotion, not from this historical reference note.

## Authoring verification

Before repository push, the zero-dependency local suite passed **13/13 Node tests** and the deterministic Payment Reminder demo assertions passed.

The demo fixture proves:

- 5 invoices scanned;
- 3 reminder-eligible units;
- 2 messages sent;
- 1 missing-contact attention path;
- 2 automated units;
- 2 exception minutes;
- 6 net minutes released at the sample baseline;
- S/ 0.04 simulated provider variable cost;
- no incident on the happy/demo path.

## Covered behavior

- due-date offset calculation;
- paid invoice exclusion;
- deterministic configured reminder stages;
- tenant-scoped source records;
- execution idempotency;
- side-effect idempotency;
- transient retry;
- permanent failure incident behavior in shared runtime tests;
- missing-contact exception accounting;
- ProcessRecord generation;
- SavingsEvent exactly-once behavior for duplicate scheduled runs;
- variable-cost attribution;
- Savings Engine rollup.

## Boundary

This is executable reference evidence only. The profile has not yet been sealed by Baseline Factory, so this package remains `DESIGN_READY` and `readyForProduction: false`.
