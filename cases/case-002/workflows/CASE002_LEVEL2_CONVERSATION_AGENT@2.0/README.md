# CASE002_LEVEL2_CONVERSATION_AGENT@2.0

Status: **CASE-LOCAL GEMINI PoC — HYBRID AGENT, NOT PRODUCTION SCHEDULING**

This is the successor PoC to the deterministic appointment harness. It keeps CASE-002 business authority deterministic while using a replaceable LLM interpreter for open-ended Spanish conversation.

```text
WhatsApp / Kapso
-> Receive-owned conversation context
-> CASE002_GEMINI_INTERPRETER@1.0
-> deterministic CASE-002 policy/state
-> internal Level-2 availability
-> explicit confirmation
-> internal sandbox Appointment
-> KAPSO_MESSAGE_SEND@1.0
```

## Authority split

Gemini may:

- classify customer intent;
- normalize customer-reported descriptions;
- recognize a plate already present in free text;
- interpret reported vehicle operational state;
- interpret natural scheduling preferences;
- understand natural slot selection and confirmation;
- recognize requests for human help.

Gemini may **not**:

- create/cancel/reschedule an appointment itself;
- invent availability;
- produce or persist a mechanical diagnosis;
- decide that a vehicle is safe to drive;
- approve warranty/comeback;
- choose provider credentials;
- execute calendar, messaging or storage tools.

The deterministic state/policy node remains the only component allowed to route, offer slots, require confirmation, and create the Level-2 sandbox appointment.

## State ownership

The source workflow is a composition artifact. In the live WhatsApp path its context + policy nodes MUST be inlined into `kapsoMessageReceiveV1`, exactly as the v1.1 state owner fix established. This preserves conversation state across separate inbound deliveries.

The Gemini interpreter is intentionally a separate **stateless** child workflow. A child-model failure must not own or destroy conversation state.

## Fallback

`Run CASE002 Gemini Interpreter` is configured to continue on failure. If Gemini, its credential, the parser, or the child workflow is unavailable, the policy node ignores model output and continues with the deterministic parsers inherited from v1.1.

Therefore:

```text
Gemini available -> flexible semantic interpretation
Gemini unavailable -> deterministic CASE-002 intake
```

## PoC persistence boundary

Conversation and sandbox appointments still use n8n workflow static data for this controlled Level-2 PoC. This remains a known production gap. Durable concurrent state belongs in the platform/Postgres before production certification.

## Calendar boundary

Appointments remain `provider=case002-level2-internal`. This workflow does not claim Google Calendar, Cal.com or Microsoft Calendar authority.


## v2.1 conversational behavior

The agent preserves scheduling preferences mentioned before the plate is collected. A customer can therefore provide symptom + mobility + day/time in one message, then provide only the plate on the next turn without being asked for the schedule again.

When the conversation is in `awaiting_slot`, selecting an already offered time has precedence over interpreting the same words as a new search preference. Final booking confirmation is accepted only in `awaiting_confirmation`.

The customer-facing tone for this PoC is **warm, feminine, natural and personable** in the style of a personable workshop scheduling assistant. It may use natural Peruvian Spanish and an occasional neutral emoji, but should avoid flirting, cutesy language, forced slang, or overacting a persona. It must remain professional: no manipulative language, no altered appointment facts, and no relaxation of CASE-002 safety/authority boundaries.
