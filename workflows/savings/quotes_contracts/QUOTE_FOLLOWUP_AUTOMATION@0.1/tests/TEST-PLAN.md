# Test Plan — Quote Follow-up

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/quote-followup.test.js`.

Reference behavior under test:
- scan pending quotes;
- skip accepted/rejected/expired quotes;
- calculate due follow-up stage;
- enforce minimum spacing;
- send idempotently and persist completed stage;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
