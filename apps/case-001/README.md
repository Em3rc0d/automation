# CASE-001 — Local PoC

Implementation workspace for `cases/CASE-001-WHATSAPP-QUOTE-ASSISTANT.md`.

> **Status: LOCAL PROOF OF CONCEPT.** This is not the final product, not a production deployment, and not P1 certification. The local track exists to validate the CASE-001 business flow with the minimum number of external services before binding real WhatsApp, client data, production auth/tenancy, backup/restore and operational controls.

## PoC runtime

The default development path is now local-first:

```text
Browser -> Next.js CASE-001 -> PostgreSQL 17
                    |
                    +-> Gemini API (semantic interpretation only)
                    +-> local messaging adapter (no real WhatsApp)
```

The PoC does **not** require Vercel, Supabase cloud, n8n or Kapso. The previously created Supabase staging project remains a later cloud-binding target and is not part of the local execution path.

Gemini remains external by design. It only normalizes natural-language intent/entities; authoritative price, discount, margin, IGV, FX and totals remain deterministic code.

## Run with Docker

Requirements:

- Docker with Docker Compose;
- a Gemini API key if using the default `CASE001_AI_PROVIDER=gemini` path.

Setup:

```bash
cd apps/case-001
cp .env.example .env
# Put GEMINI_API_KEY only in this local, gitignored .env file.
docker compose up --build
```

Open `http://localhost:3000`.

Default local admin token in `.env.example` / Compose fallback:

```text
case001-local-only
```

Change it in `.env` if desired. Both application and database ports bind to loopback (`127.0.0.1`) in the PoC Compose file.

For a fully offline semantic test, set:

```env
CASE001_AI_PROVIDER=mock
```

The messaging provider remains:

```env
CASE001_MESSAGING_PROVIDER=local
```

so no WhatsApp message is sent.

## Fresh rebuild / reset

A clean PoC database is reproducible from the repository migrations and synthetic fixtures:

```bash
docker compose down -v
docker compose up --build
```

On a new database volume, PostgreSQL applies all files in `supabase/migrations/` in lexical order and then applies `fixtures/seed-staging.sql`.

The seed is synthetic engineering data only. It is not client data.

## What is implemented in the PoC

- deterministic quote engine for price, discount, margin, IGV, stock, snapshot freshness and FX requirements;
- Gemini semantic extraction with Zod validation and no arithmetic authority;
- local messaging simulation plus the existing Kapso adapter kept for later provider binding;
- PostgreSQL persistence behind a small database boundary using `DATABASE_URL`;
- tenant-scoped customer/product/message/quote lookups;
- quote request, revision/version chaining, acceptance and rejection;
- approval creation and approval/rejection decisions;
- SAP CSV/XLSX import with validation, immutable snapshots and SHA-256 idempotency;
- historical quote CSV/XLSX import as commercial context;
- follow-up state using last inbound activity and explicit template-required state after the free-form window;
- quote PDF generation;
- private PoC console for simulated messages, SAP import, historical import, status and approvals;
- health endpoint at `/api/health`;
- integration tests against PostgreSQL in CI.

## Local persistence boundary

The active PoC adapter is PostgreSQL (`lib/persistence/database.ts`). A small Supabase service-role helper is retained under `lib/persistence/supabase.ts` for the later cloud-binding phase, but it is intentionally not used by the local PoC.

Supabase itself is PostgreSQL-backed, so the data model/migrations remain reusable. The final tenant Auth/RLS/cloud access model is **not** claimed by this PoC and must be designed/tested before production use.

## Useful local endpoints

All operational endpoints except health require `x-admin-token`.

```text
GET  /api/health
GET  /api/status
POST /api/poc/message
POST /api/import/sap
POST /api/import/history
GET  /api/approvals
POST /api/approvals
POST /api/jobs/followups
GET  /api/quotes/:id/pdf
```

`POST /api/poc/message` is deliberately blocked unless the messaging provider is `local`.

## Database scripts outside Docker

If PostgreSQL is already running and `DATABASE_URL` points to it:

```bash
npm install
npm run db:migrate
npm run db:seed
npm test
npm run dev
```

## PoC evidence boundary

This phase may demonstrate:

- local PostgreSQL persistence;
- reproducible migrations/reset;
- SAP file ingestion;
- historical context;
- deterministic quote calculations;
- Gemini interpretation when a local key is supplied;
- quote lifecycle/revisions;
- approvals;
- local message simulation;
- PDFs;
- idempotency and selected end-to-end scenarios.

It does **not** demonstrate or certify:

- Kapso production behavior;
- WhatsApp/Meta onboarding or real delivery;
- public webhooks;
- production deployment;
- final Auth/RLS/tenant membership;
- production backup/restore;
- production incident drills/observability;
- real client SAP mappings/data/commercial policy;
- P1 certification.

See `cases/CASE-001-LOCAL-POC.md` for the execution/evidence ledger.

## Gate after the PoC

Only after local behavior matches agreed manual fixtures do we bind the real external systems: authorized client SAP exports, real historical quotes/rules, Gemini client secret, Kapso/WhatsApp, cloud deployment and production-grade tenant/security/operations evidence.

No SAP writeback is included in this PoC or in the current V1 boundary.
