# Test Plan — Email Classification and Routing

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/email-classify-route.test.js`.

Reference behavior under test:
- accept structured email;
- evaluate deterministic keyword/domain rules;
- fall back to general queue;
- persist category/queue decision;
- emit one email savings unit;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
