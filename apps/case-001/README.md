# CASE-001 — WhatsApp Quote Assistant

Implementation workspace for `cases/CASE-001-WHATSAPP-QUOTE-ASSISTANT.md`.

## Current implementation boundary

This app is intentionally code-first for the first pilot. That is allowed by the repository architecture: n8n remains an optional runtime, but the control-plane/domain logic must not depend on n8n internals. Using a Next.js/Node worker here also avoids crossing the n8n commercial-license gate before the pilot proves value.

Implemented:

- deterministic quote engine (price, discount, margin, IGV, stock, stale SAP check, FX requirement);
- Gemini adapter for natural-language intent extraction;
- Kapso/WhatsApp provider adapter with configurable send endpoint and webhook normalization;
- webhook idempotency through unique provider message IDs;
- customer lookup and previous-quote context;
- quote creation, sent/accepted/rejected states;
- SAP CSV/XLSX import with aliases, validation and immutable snapshots;
- private upload endpoint protected by an admin token;
- Supabase/Postgres schema with RLS enabled and service-role-only pilot posture;
- synthetic fixtures and quote-engine tests.

Not bound yet because they require real pilot input:

- exact SAP column mapping for the client's export;
- real customer/commercial rules;
- client-owned Gemini key;
- Kapso workspace/phone binding and exact live send endpoint;
- choice of Supabase project or authorization to create a dedicated project;
- production deployment and real WhatsApp smoke test.

## Local/mock mode

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Set `CASE001_MODE=mock` to test semantic extraction and outbound messaging without external credentials. Database-backed routes still require Supabase.

## Live-mode order

1. Apply `supabase/migrations/001_case_001.sql` to the dedicated pilot project.
2. Configure server-only Supabase service-role credentials.
3. Bind the client's Gemini key.
4. Bind Kapso credentials and webhook URL.
5. Upload a real authorized SAP export and review rejected rows.
6. Import 10–20 historical quotes/customer commercial context.
7. Replace default policy values with client-confirmed rules.
8. Run acceptance fixtures from the case document.
9. Only after parity with manual calculations, enable real outbound WhatsApp.

## Security notes

- Never commit Gemini/Kapso/Supabase secrets.
- Browser code never receives service-role credentials.
- Uploaded SAP data is treated as tenant-private operational data.
- This V1 never writes back to SAP.
- AI output is schema-validated and never owns authoritative arithmetic.
- The real pilot must move from the temporary admin-token upload gate to tenant authentication/RLS membership before broader client access.

## Human handoff gate

Engineering can proceed without the client until provider/database binding. At that point the operator needs:

- the chosen Supabase project (or explicit approval to create a dedicated one);
- Kapso workspace/API credential + connected WhatsApp number;
- Gemini API key configured as a deployment secret;
- 2–5 real SAP CSV/XLSX exports;
- 10–20 historical quotes (may be anonymized for staging);
- confirmed discount/margin/credit/FX/IGV rules and quote format.
