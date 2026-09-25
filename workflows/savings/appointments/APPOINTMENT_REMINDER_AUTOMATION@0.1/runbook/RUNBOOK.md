# Runbook — Appointment Reminder

Monitor calendar connector health, scheduler freshness, events scanned, reminders eligible/sent, missing contacts, message-provider retries, incidents and variable cost.

Common failures:
1. calendar credential expired;
2. message credential expired;
3. cancelled event not synchronized;
4. attendee has no reachable contact;
5. scheduler delayed beyond scan window;
6. duplicate provider callback/run;
7. timezone/configuration mismatch.

Operator response: inspect tenant + trace → verify event state/timezone → repair connector/config → replay with original idempotency semantics → verify exactly one reminder/SavingsEvent per attendee stage.
