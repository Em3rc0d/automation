# CASE-001 — Local PoC Execution / Evidence Ledger

Status: **PoC / engineering validation only**  
Final product: **NO**  
Production ready: **NO**  
P1 certified: **NO**

This document records the local proof-of-concept track for CASE-001. It does not replace `CASE-001-WHATSAPP-QUOTE-ASSISTANT.md`, which remains the productive pilot design and acceptance authority.

## Purpose

Reduce early infrastructure/configuration overhead while proving that the business flow can run reproducibly with:

```text
Docker Compose
+ Next.js / Node.js
+ PostgreSQL local
+ Gemini API (optional for semantic integration; mock available for CI)
+ local messaging adapter
+ SAP CSV/XLSX files
```

The PoC explicitly avoids claiming that simulated messaging is equivalent to Kapso/WhatsApp production behavior.

## Architecture under test

```text
LOCAL BROWSER
    |
    v
Next.js CASE-001
    |
    +--> PostgreSQL 17 local
    |
    +--> Gemini API (intent/entities only)
    |
    +--> local messaging adapter
            |
            +--> persists simulated outbound messages
```

Business arithmetic stays deterministic. SAP remains external authority; the PoC only consumes authorized export files and never writes back.

## Reproducibility contract

From `apps/case-001`:

```bash
cp .env.example .env
# add GEMINI_API_KEY locally if testing Gemini
docker compose up --build
```

Full reset:

```bash
docker compose down -v
docker compose up --build
```

A fresh PostgreSQL volume applies the same CASE-001 migrations already used by the cloud staging schema, followed by synthetic seed data.

## Automated evidence in repository

The CASE-001 CI job is configured to start PostgreSQL 17, apply migrations, apply the synthetic seed, execute Vitest and build the Next.js application. A PostgreSQL integration test covers at minimum:

- immutable SAP snapshot import;
- duplicate SAP file/hash idempotency;
- local quote request through the workflow;
- duplicate inbound message idempotency;
- quote acceptance;
- deterministic commercial exception -> pending approval.

CI evidence is necessary but not sufficient for the real pilot.

## Manual PoC scenarios to execute locally

Use the console or `POST /api/poc/message` for the message-driven cases. Capture the resulting status, quote, exception codes and persisted messages.

| Scenario | PoC target | Expected boundary |
| --- | --- | --- |
| Normal quote | `Cotízame 10 EPOX-7000-GRIS` | deterministic calculation and local outbound |
| Duplicate event | repeat same explicit providerMessageId via API | no duplicate quote/send |
| Discount exception | request > configured auto limit | `awaiting_approval` |
| Stock exception | quantity > latest snapshot | approval required |
| Stale SAP | snapshot older than threshold | approval required |
| Currency conversion | request different currency without FX | calculation refuses rather than inventing FX |
| Revision | change quantity/discount after sent quote | new version linked to parent |
| Acceptance | `Acepto` | latest open quote becomes accepted |
| Rejection | explicit rejection | latest open quote becomes rejected |
| Historical reference | import canonical history then refer to prior quote | history is context, current snapshot/policy remains authority |
| PDF | request stored quote PDF endpoint | deterministic document from persisted quote |
| Follow-up | run follow-up job | local send only if within configured free-form window logic |

## Proven by this PoC only after evidence exists

- local process can be bootstrapped from repository state;
- PostgreSQL schema supports CASE-001 state;
- deterministic quote/policy code is independent of Gemini arithmetic;
- file-based SAP snapshot import is viable;
- historical quotes can be represented as reference context;
- local message orchestration can exercise quote lifecycle and approvals;
- idempotency behavior can be tested without a cloud messaging provider.

## Explicitly NOT proven / NOT certified

- Kapso API compatibility in the client's workspace;
- Meta/WhatsApp onboarding, templates, conversation-window behavior or real delivery;
- webhook signature verification against the final provider contract;
- internet-facing deployment/security;
- final tenant authentication and RLS membership policies;
- production secret management;
- production backup, restore and rollback;
- production incident/alert/retry operations;
- real SAP column mapping or data quality;
- real customer/commercial rules;
- authoritative FX integration;
- real salesperson/customer acceptance fixtures;
- P1 certification.

## Promotion gate

The PoC can move to a real pilot-binding phase only after:

1. Docker reset/rebuild succeeds from a clean volume.
2. CI migrations/tests/build are green.
3. Deterministic fixtures match expected manual quote calculations.
4. Gemini semantic fixtures are reviewed with a client-owned local key.
5. Real authorized SAP exports and historical quote samples are available.
6. Commercial policy is explicitly confirmed.
7. Kapso/WhatsApp credentials and number are bound and tested separately.
8. Cloud auth/tenant isolation, secrets, backup/restore and incident evidence are added.

Until all real-pilot gates are satisfied, this artifact remains a **PoC and nothing more**.
