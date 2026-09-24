# Test Plan — Supplier Status Change Notification

Status: **SKELETON / NO TEST EVIDENCE YET**

Required: happy path; malformed input; duplicate; transient/permanent provider failure; credential expiry; tenant isolation; retry/timeout; variable cost capture; SavingsEvent exactly once; exception/oversight minutes; rollback/replay without double counting.

Runtime-specific profile: `scheduled`. Savings unit: `status change`.
