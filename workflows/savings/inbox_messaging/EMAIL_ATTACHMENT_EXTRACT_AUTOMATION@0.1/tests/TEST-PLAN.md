# Test Plan — Email Attachment Extraction

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/email-attachment-extract.test.js`.

Reference behavior under test:
- inspect structured attachment list;
- filter by MIME/size policy;
- store each eligible attachment idempotently;
- record one unit per stored attachment;
- report skipped attachments without false savings;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
