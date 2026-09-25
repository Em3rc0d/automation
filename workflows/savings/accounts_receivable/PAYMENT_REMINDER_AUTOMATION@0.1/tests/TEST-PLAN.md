# Test Plan — Payment Reminder

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Required: happy path; malformed input; duplicate; transient/permanent provider failure; credential expiry; tenant isolation; retry/timeout; variable cost capture; SavingsEvent exactly once; exception/oversight minutes; rollback/replay without double counting.

Runtime-specific profile: `scheduled`. Savings unit: `invoice`.


## Reference executable evidence

- `runtime/savings-p0/test/payment-reminder.test.js`
- `runtime/savings-p0/test/runtime.test.js`
- `runtime/savings-p0/test/retry.test.js`
- `runtime/savings-p0/demo/payment-reminder/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

These tests are reference-runtime evidence only until `zero-deps-node-v1` receives an explicit Baseline Factory certification profile.
