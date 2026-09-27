# CASE002_GEMINI_RESPONSE_RENDERER@1.0

Status: **CASE-LOCAL GEMINI PoC — LANGUAGE ONLY, NO BUSINESS AUTHORITY**

This workflow converts an already-authorized deterministic CASE-002 response plan into natural customer-facing Spanish for WhatsApp.

```text
deterministic CASE-002 policy
-> response plan + protected facts + deterministic fallback
-> Gemini response renderer
-> deterministic response validator
-> KAPSO_MESSAGE_SEND@1.0
```

## Authority boundary

The renderer may improve phrasing, rhythm and conversational warmth. It may not change appointment facts, availability, dates, times, plate values, prices, safety wording, routing decisions or booking state.

It has no tools and no side-effect authority.

## Voice

The target voice is warm, feminine, natural, attentive and confident, similar to a real workshop receptionist on WhatsApp.

The model must not force that voice through stereotypes. It should avoid flirtation, cutesy diminutives, pet names, hearts, wink emojis, excessive emoji use, or forced slang. It should not explicitly state a gender.

## Protected facts

The deterministic policy provides `protectedFacts`. Any rendered answer that omits a required protected fact, introduces an unknown date/time/plate/price, or contains internal implementation terminology must be rejected by the deterministic validator.

When rendering or validation fails, the deterministic `fallbackText` is sent instead.

## Internal terminology

Customer-facing replies must not expose implementation terms such as:

```text
piloto
Level-2
sandbox
workflow
Gemini
internal calendar
provider
node
model
API
```

These terms remain available in logs and engineering documentation only.
