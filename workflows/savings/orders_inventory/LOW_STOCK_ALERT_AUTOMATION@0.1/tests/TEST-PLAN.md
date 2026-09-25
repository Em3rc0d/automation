# Test Plan — Low Stock Alert

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/low-stock-alert.test.js`.

Reference behavior under test:
- scan tenant inventory rows;
- compare onHand to reorderPoint;
- ignore inactive/sufficient stock;
- alert once per stock/threshold fingerprint;
- missing alert contact becomes exception time;
- duplicate execution does not double-count savings;
- tenant-scoped execution and provider-neutral adapter boundaries are preserved.

Canonical TESTED/APPROVED_BASELINE promotion still requires factory certification of `zero-deps-node-v1`.
