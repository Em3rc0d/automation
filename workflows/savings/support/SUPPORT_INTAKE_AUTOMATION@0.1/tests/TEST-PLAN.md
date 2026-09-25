# Test Plan — Support Intake

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/support-intake.test.js`.

Reference behavior under test:
- accept inbound support request;
- normalize subject/body/channel;
- derive stable ticket ID from source event;
- upsert ticket once;
- emit ticket savings unit;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
