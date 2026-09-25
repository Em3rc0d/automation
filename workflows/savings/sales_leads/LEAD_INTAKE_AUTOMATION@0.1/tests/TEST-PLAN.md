# Test Plan — Lead Intake Automation

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/lead-intake.test.js`.

Reference behavior under test:
- structured inbound event;
- normalize deterministic contact fields;
- tenant-scoped idempotency by source event;
- upsert lead record;
- ProcessRecord + SavingsEvent;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
