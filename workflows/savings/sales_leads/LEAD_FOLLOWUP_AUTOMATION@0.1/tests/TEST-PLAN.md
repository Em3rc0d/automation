# Test Plan — Lead Follow-up

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/lead-followup.test.js`.

Covered:
- earliest due incomplete stage;
- won/closed/do-not-contact guard;
- minimum spacing between stages;
- persistent completed-stage state;
- missing-contact exception accounting;
- transient provider retry;
- idempotent side effect;
- ProcessRecord/SavingsEvent output.

Canonical promotion still requires factory certification of `zero-deps-node-v1`.
