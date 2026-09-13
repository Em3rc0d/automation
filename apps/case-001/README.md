# CASE-001 — WhatsApp Quote Assistant

Implementation workspace for `cases/CASE-001-WHATSAPP-QUOTE-ASSISTANT.md`.

## Current implementation boundary

This app is intentionally code-first for the first pilot. That is allowed by the repository architecture: n8n remains an optional runtime, but the control-plane/domain logic must not depend on n8n internals. Using a Next.js/Node worker here also avoids crossing the n8n commercial-license gate before the pilot proves value.

Implemented:

- deterministic quote engine (price, discount, margin, IGV, stock, stale SAP check, FX requirement);
- Gemini adapter for natural-language intent extraction;
- Kapso/WhatsApp provider adapter with configurable send endpoint and webhook normalization;
- webhook idempotency through unique provider message IDs;
- tenant-scoped customer/product/message/quote lookups;
- previous-quote context plus quote revision/version chaining;
- approval creation, approval/rejection decision flow, and approved quote delivery;
- sent/accepted/rejected/revised/expired lifecycle states;
- SAP CSV/XLSX import with aliases, validation, immutable snapshots and file-hash idempotency;
- canonical historical quote CSV/XLSX importer;
- follow-up scheduler using the last inbound WhatsApp activity as the 24-hour boundary;
- explicit `template_required` state for follow-ups outside the free-form WhatsApp window;
- protected PDF generation endpoint for stored quotes;
- private pilot console for SAP import, historical quote import, status and approvals;
- Supabase/Postgres schema with RLS enabled and service-role-only pilot posture;
- dedicated free staging project: `automation-case-001-staging` in `sa-east-1`;
- synthetic staging seed data;
- CI tests covering arithmetic, stock, stale snapshots, margin, FX, import parsers and webhook normalization.

## Staging database

The dedicated staging project is active and has the CASE-001 migrations applied. Synthetic fixture data is present only for engineering validation. No client SAP/customer data has been loaded yet.

RLS is intentionally enabled without browser policies during this pilot stage. Browser clients therefore cannot query these tables directly; server-side service-role access is the only allowed path until real tenant authentication/membership policies are introduced.

## Local/mock mode

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Set `CASE001_MODE=mock` to test semantic extraction and outbound messaging without external credentials. Database-backed routes still require Supabase.

## Live-mode order

1. Bind server-only credentials for the already-created `automation-case-001-staging` project.
2. Deploy the pilot app with an admin secret and `CASE001_MODE=mock` for a database-backed staging smoke test.
3. Bind the client-owned Gemini key and validate semantic fixtures.
4. Bind the Kapso workspace, connected WhatsApp number and current send/webhook contract.
5. Upload a real authorized SAP export and confirm the exact column mapping.
6. Import 10–20 historical quotes/customer commercial context using `fixtures/historical-quotes-template.csv` as the canonical shape.
7. Replace engineering defaults with client-confirmed discount/margin/credit/FX/IGV rules.
8. Run the acceptance fixtures from the case document and compare automated results with manual calculations.
9. Only after parity, enable real outbound WhatsApp and execute the live pilot smoke test.

## Security notes

- Never commit Gemini/Kapso/Supabase secrets.
- Browser code never receives service-role credentials.
- Uploaded SAP and historical quote data is treated as tenant-private operational data.
- This V1 never writes back to SAP.
- AI output is schema-validated and never owns authoritative arithmetic.
- Quote lines preserve whether their source was a live SAP snapshot or historical reference.
- Real outbound sends remain disabled until provider binding and business-rule parity are complete.
- The temporary admin-token console is pilot-only; broader client access requires Supabase Auth membership/RLS policies.

## Human handoff gate

The database, schema, synthetic staging data and code path are prepared. The next steps that genuinely require operator/client input are:

- server-side deployment secret for Supabase service-role access (do not paste it in chat or commit it);
- client-owned Gemini API key configured directly in the deployment secret store;
- Kapso workspace/API credential, connected WhatsApp number and webhook configuration;
- 2–5 real authorized SAP CSV/XLSX exports;
- 10–20 historical quotes, preferably anonymized for staging if required;
- confirmed discount/margin/credit/FX/IGV rules and the final quote presentation format;
- seller/customer phone(s) for the real WhatsApp smoke test.

Everything before those bindings should be executable without changing client systems.
