# CASE002_LEVEL2_APPOINTMENT_AGENT@1.0

Status: **CASE-LOCAL LEVEL-2 TEST HARNESS — NOT A PRODUCTION CALENDAR BASELINE**

This workflow gives CASE-002 a persistent conversational appointment loop over WhatsApp while the real calendar adapter remains in certification.

It is intentionally narrow:

```text
customer text
-> workshop intake conversation
-> plate collection
-> internal Level-2 availability
-> slot selection
-> persisted sandbox Appointment
-> KAPSO_MESSAGE_SEND@1.0 confirmation
```

Safety/authority rules:
- never claims a mechanical diagnosis;
- roadside/immobilized requests route to human review;
- warranty/comeback requests route to human review;
- provider message IDs are used for duplicate suppression;
- timezone is explicit: America/Lima;
- outbound WhatsApp still goes through the hardened Kapso send adapter;
- booking confirmation explicitly states that the appointment is stored in the internal Level-2 pilot calendar, not Google Calendar.

Persistence uses n8n workflow static data for the controlled Level-2 test only. This is **not** the final scheduling authority and does not satisfy the production race/idempotency gate for Google Calendar/Cal.com/Microsoft Calendar.

Production promotion still requires:
- real `calendar.availability.read`;
- provider-backed `calendar.event.create` or `booking.create`;
- provider event/booking ID persistence;
- race-safe create/hold semantics;
- duplicate request protection against the external authority;
- reschedule/cancel synchronization;
- acceptance evidence.
