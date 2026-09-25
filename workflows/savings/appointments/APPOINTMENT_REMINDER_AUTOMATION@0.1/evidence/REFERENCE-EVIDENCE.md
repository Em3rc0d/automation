# Appointment Reminder — Reference Evidence

Executable under `zero-deps-node-v1`.

Paths:
- code: `runtime/savings-p0/src/workflows/appointment-reminder.js`;
- tests: `runtime/savings-p0/test/appointment-reminder.test.js`;
- demo: `runtime/savings-p0/demo/appointment-reminder/run.js --assert`;
- CI: `.github/workflows/savings-p0-validation.yml`.

The deterministic demo proves two automated attendee reminders, one missing-contact exception path, duplicate-safe savings semantics and simulated variable messaging cost.

Boundary: **REFERENCE_IMPLEMENTED != TESTED != APPROVED_BASELINE**.
