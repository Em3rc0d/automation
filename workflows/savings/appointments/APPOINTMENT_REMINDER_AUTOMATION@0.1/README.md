# Appointment Reminder

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `APPOINTMENT_REMINDER_AUTOMATION@0.1`
- Domain: `appointments`
- Runtime: `scheduled`
- Savings unit: `reminder`

## Human active work reduced

Review upcoming appointments and remind attendees.

## Reference implementation

- Runtime: `zero-deps-node-v1`
- Code: `runtime/savings-p0/src/workflows/appointment-reminder.js`
- Tests: `runtime/savings-p0/test/appointment-reminder.test.js`
- Demo: `runtime/savings-p0/demo/appointment-reminder/run.js`
- Adapter reuse: `MemoryCalendarAdapter` + `MemoryMessageAdapter`

## Behavior

```text
calendar events
→ tenant/time-window scan
→ skip cancelled/completed
→ match reminder stage
→ one unit per attendee reminder
→ missing contact => attention + exception minutes
→ idempotent send
→ ProcessRecord + SavingsEvent + ExecutionEvent
```

A repeated scheduler run at the same reminder stage does not resend or double-count savings.

Reference evidence does not promote this package to canonical TESTED or APPROVED_BASELINE.
