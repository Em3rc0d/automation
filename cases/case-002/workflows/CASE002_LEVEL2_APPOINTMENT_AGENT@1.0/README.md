# CASE002_LEVEL2_APPOINTMENT_AGENT@1.0

Status: **CASE-LOCAL LEVEL-2 TEST HARNESS — NOT A PRODUCTION CALENDAR BASELINE**

This workflow gives CASE-002 a persistent conversational appointment loop over WhatsApp while the real calendar adapter remains in certification.

It is intentionally narrow, but the WhatsApp UX is conversational rather than a fixed form:

```text
customer free text
-> service/issue clarification when needed
-> operational-state question for repair/diagnostic requests
-> plate collection
-> natural-language schedule preference ("mañana por la tarde", "viernes a las 11")
-> matching Level-2 availability
-> natural-language slot selection ("el segundo", "el de las 11")
-> explicit summary + confirmation
-> persisted sandbox Appointment
-> KAPSO_MESSAGE_SEND@1.0 confirmation
```

This v1.1 harness is **not an LLM**. It is a deterministic conversational state machine so behavior is auditable while the transport/state/calendar boundaries are still under certification. A model-backed language layer can be added later, but it must not become the scheduling authority or produce mechanical diagnoses.

Safety/authority rules:
- never claims a mechanical diagnosis;
- roadside/immobilized requests route to human review;
- warranty/comeback requests route to human review;
- provider message IDs are used for duplicate suppression;
- timezone is explicit: America/Lima;
- outbound WhatsApp still goes through the hardened Kapso send adapter;
- booking confirmation explicitly states that the appointment is stored in the internal Level-2 pilot calendar, not Google Calendar;
- a booking is not created until the customer explicitly confirms the summarized appointment;
- generic requests such as "mantenimiento" trigger a clarifying question instead of jumping directly to a slot list;
- repair/diagnostic requests ask whether the vehicle can still move under its own power before continuing.

Persistence uses n8n workflow static data for the controlled Level-2 test only. In the live WhatsApp composition, the conversation state node is inlined into the active `kapsoMessageReceiveV1` webhook workflow so the state owner is the production webhook workflow across separate inbound deliveries. A prior child-subworkflow composition reset to `idle` between WhatsApp messages and was rejected by live evidence. This is **not** the final scheduling authority and does not satisfy the production race/idempotency gate for Google Calendar/Cal.com/Microsoft Calendar.

Production promotion still requires:
- real `calendar.availability.read`;
- provider-backed `calendar.event.create` or `booking.create`;
- provider event/booking ID persistence;
- race-safe create/hold semantics;
- duplicate request protection against the external authority;
- reschedule/cancel synchronization;
- acceptance evidence.
