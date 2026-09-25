# Test Plan — Renewal Reminder

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/renewal-reminder.test.js`.

Reference behavior under test:
- scan active contracts;
- calculate days until renewal;
- match configured reminder offsets;
- send idempotently per contract/offset;
- missing contact becomes exception time;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
