# Test Plan — Unanswered Message Watchdog

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/unanswered-message-watchdog.test.js`.

Reference behavior under test:
- scan tenant message threads;
- ignore closed/already-answered threads;
- compare inbound age to SLA;
- alert owner once per inbound message;
- missing owner contact becomes exception time;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
