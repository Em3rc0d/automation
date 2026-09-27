# CASE002_GEMINI_INTERPRETER@1.0

Status: **CASE-LOCAL PoC — SEMANTIC INTERPRETATION ONLY**

This workflow is a stateless language layer for CASE-002. It receives the current message plus a bounded conversation context, calls Google Gemini through n8n's built-in Google Gemini Chat Model, and returns a structured `ConversationInterpretation`.

It does **not**:

- create, cancel or reschedule appointments;
- query or invent availability;
- call WhatsApp;
- access calendar credentials;
- make mechanical diagnoses;
- decide that a vehicle is safe to drive;
- approve warranty/comeback claims;
- persist conversation memory.

The output is advisory input to deterministic CASE-002 policy. The caller must validate the output and remains the only component allowed to decide the next business action.

## Input

Provider-neutral caller envelope:

```json
{
  "tenantId": "case002-level2-test",
  "providerPhoneNumberId": "...",
  "senderId": "...",
  "providerMessageId": "...",
  "providerEventId": "...",
  "text": "el viernes después del almuerzo",
  "agentContext": {
    "currentDate": "2026-09-19",
    "step": "awaiting_preference",
    "known": {},
    "offeredSlots": [],
    "proposedSlot": "",
    "recentConversation": []
  }
}
```

## Output

On success the workflow preserves the caller envelope and adds:

```json
{
  "llmInterpretation": {
    "schemaVersion": 1,
    "intent": "appointment_preference",
    "requestType": "other",
    "customerReportedSummary": "",
    "vehicleOperationalState": "unknown",
    "plate": "",
    "schedulePreference": {
      "recognized": true,
      "raw": "el viernes después del almuerzo",
      "targetDate": "",
      "weekday": "friday",
      "daypart": "afternoon",
      "exactTime": ""
    },
    "selectedSlotReference": "",
    "explicitConfirmation": false,
    "humanHelpRequested": false,
    "mechanicalDiagnosisProduced": false,
    "confidence": "high"
  },
  "llmMeta": {
    "ok": true,
    "provider": "gemini",
    "model": "models/gemini-2.5-flash"
  }
}
```

On Gemini/model/parser failure it returns `llmMeta.ok=false`. The caller must fall back to deterministic CASE-002 behavior.

## Credential rule

Repository workflow JSON MUST NOT contain a bound credential. Live runtime binding uses a credential of type `googlePalmApi` named:

```text
CASE002 Gemini API
```

The API key remains in n8n's credential store and never in Git, workflow static data, execution payloads or prompts.

## Contract

Canonical output contract:

```text
cases/case-002/contracts/conversation-interpretation.schema.json
```

The LLM is replaceable. A future Ollama/local-model adapter must produce the same contract so the policy layer does not depend on Gemini.
