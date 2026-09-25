# Test Plan — Document Archive

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/document-archive.test.js`.

Reference behavior under test:
- accept structured document;
- derive deterministic tenant archive path;
- sanitize path segments;
- store idempotently;
- record archive ProcessRecord and SavingsEvent;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
