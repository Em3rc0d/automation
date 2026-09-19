# CASE-002 — Gemini Conversation PoC

Status: **LIVE LEVEL-2 GEMINI PoC — SANDBOX SCHEDULING, NOT PRODUCTION**

## Frozen PoC decision

The first model-backed conversational PoC uses the existing Railway n8n service and Google Gemini through n8n's native Google Gemini Chat Model.

**Hard infrastructure constraint:** the PoC MUST NOT increase the Railway service count.

```text
WhatsApp / Kapso
       |
       v
existing case002-n8n
       |
       +--> CASE002_GEMINI_INTERPRETER@1.0
       |       |
       |       +--> Google Gemini API
       |
       +--> deterministic CASE-002 policy/state
       |       |
       |       +--> response plan + deterministic fallback
       |                |
       |                +--> CASE002_GEMINI_RESPONSE_RENDERER@1.0
       |                           |
       |                           +--> deterministic render validator
       |
       +--> existing Kapso send adapter
```

No `case002-ollama`, `conversation-agent`, Redis, Kafka, vector database or additional Railway service is introduced for this PoC.

A future local Ollama/llama.cpp implementation is an adapter replacement behind the same `ConversationInterpretation` contract.

## Authority rule

```text
Gemini = semantic interpretation
CASE-002 deterministic policy = business authority
connector/provider = external side-effect authority
```

Gemini may extract intent, customer-reported facts, missing information, plate text, reported mobility state, scheduling preference, slot reference and explicit confirmation. Final confirmation is only valid while deterministic state is `awaiting_confirmation`; selecting an offered slot is not itself a booking confirmation.

Gemini never owns:

- mechanical diagnosis;
- safe-to-drive conclusions;
- warranty eligibility;
- available appointment slots;
- appointment creation/cancellation/reschedule;
- WhatsApp credentials;
- calendar credentials;
- direct SQL/database access.

## Context envelope

The live Receive workflow owns conversation state. Before each semantic interpretation it provides only bounded context:

```text
current date + America/Lima
current conversation step
known structured facts
offered slots
proposed slot
last <= 8 bounded conversation messages
current customer message
```

Secrets, provider tokens and unrelated tenant/customer data are never included.

## Failure model

Model availability must not become a single point of failure.

```text
Gemini success
-> schema-valid interpretation
-> deterministic policy

Gemini timeout/auth/parser/error
-> no model interpretation
-> deterministic v1.1-compatible fallback
```

Outbound provider send remains fail-closed. A Gemini failure may degrade conversational understanding; it must not silently claim that an external business action succeeded.

## Credential

Expected n8n credential:

```text
name: CASE002 Gemini API
type: googlePalmApi
```

The API key is never committed to Git. Runtime bootstrap validates the credential and configured model before publishing the PoC composition.

Default model for the initial PoC:

```text
models/gemini-2.5-flash
```

Override:

```text
CASE002_GEMINI_MODEL
```

A model change is configuration, not a CASE-002 domain-contract change.

## Live mutation gate

The runtime feature flag is:

```text
CASE002_LEVEL2_GEMINI_POC_ON_STARTUP=true
```

It is one-shot and must be returned to `false` after a successful deployment.

The repository backup law remains mandatory: no live n8n import, credential binding, publish, overlay or restart/redeploy that can mutate state without a verified checkpoint immediately beforehand.

## Production gaps preserved

This PoC does not close:

- durable conversation persistence;
- transactional idempotency/outbox;
- race-safe external booking;
- Google/Cal.com/Microsoft Calendar certification;
- external provider event persistence;
- production reschedule/cancel synchronization;
- robust multi-replica/concurrent state handling.

The sandbox calendar remains `case002-level2-internal`.


## Conversation tone

CASE-002 may speak in a warm, feminine, natural and personable workshop-assistant voice to make WhatsApp feel human rather than form-like. Tone never changes business authority: dates, slots, confirmations, safety routing and provider receipts remain deterministic facts.


## Response rendering

Gemini now has two separate non-authoritative roles:

```text
semantic interpreter -> understand the customer's message
response renderer     -> phrase an already-decided reply naturally
```

The renderer receives no scheduling authority. Deterministic policy supplies a response plan, protected facts and a fallback. A deterministic validator checks the rendered reply before Kapso send. If the renderer fails, omits protected facts, invents a date/time/plate/price, or exposes internal terminology, the fallback is sent.

The tone target is warm, feminine, natural, attentive and confident without explicit gender performance, flirtation, cutesy language or forced slang.

Customer-facing replies do not expose `piloto`, `Level-2`, `sandbox`, internal calendar/provider details, workflow/model/node/API terminology, or other implementation details.
