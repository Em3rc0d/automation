# Test Plan — Appointment Reminder

Status: **REFERENCE TESTS IMPLEMENTED / CANONICAL TESTED GATE NOT CLAIMED**

Reference tests: `runtime/savings-p0/test/appointment-reminder.test.js`.

Covered:
- configured reminder windows;
- cancelled appointment exclusion;
- one reminder per attendee;
- missing-contact exception minutes;
- duplicate scheduler replay;
- transient provider retry;
- ProcessRecord and SavingsEvent generation;
- variable provider cost attribution.

Canonical TESTED/APPROVED promotion still requires factory certification of `zero-deps-node-v1`.
