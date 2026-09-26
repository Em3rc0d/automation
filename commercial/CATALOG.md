# Commercial Catalog v0 — Productized Automation Services

This catalog is intentionally narrower than our total technical capability.


## Savings Workflow product model

El catálogo comercial se construye sobre `workflows/SAVINGS-WORKFLOW-CATALOG.md`, pero no vende capabilities técnicas. Un Savings Workflow debe reemplazar o reducir un proceso repetitivo humano medible.

Ejemplos de unidad comercial:
- cotización preparada;
- factura procesada;
- cita gestionada;
- consulta de proveedor resuelta;
- ticket clasificado/enrutado;
- documento registrado;
- recordatorio ejecutado.

Cada instalación liga configuración, conectores, approval policy y SavingsBaseline.

### Economics guardrail

Antes de un piloto pagado no se activa infraestructura productiva persistente solo para estar “listos”. Producción debe preferir runtime compartido/metered y evitar servidores/proyectos dedicados por tenant. Costos variables extraordinarios de AI/OCR/WhatsApp/proveedores deben ser client-owned cuando sea práctico o tener quota/metering explícito.

```text
local proof
→ demo
→ baseline
→ paid pilot
→ minimum production runtime
→ acceptance
→ recurring support/optimization
```

## LeadFlow — P0 commercial offer

Promise: **do not lose inbound prospects and make follow-up measurable.**

Typical flow:

```text
Web / Meta / WhatsApp / Email
→ normalize lead
→ dedupe
→ CRM/database
→ assign owner
→ immediate response
→ timed follow-up
→ status/result
→ reporting
```

Ideal clients:
- services businesses;
- agencies/consultancies;
- academies;
- real estate;
- workshops/technical services;
- B2B providers.

Value metrics:
- leads processed;
- response time;
- leads without follow-up;
- automated follow-ups;
- human exceptions;
- hours released;
- conversion metrics only when attribution is defensible.

Initial pricing hypothesis, to validate with market:
- pilot: S/ 700–1,200;
- normal implementation: S/ 1,500–3,000;
- support/monitoring: S/ 200–500/month.

## Quote2Cash — P0/P1 commercial offer

Promise: **reduce friction between customer interest and payment.**

```text
request
→ quote data
→ calculation/template
→ PDF/document
→ send
→ follow-up
→ accepted/rejected
→ invoice/payment request
→ due-date monitoring
→ reminders/escalation
```

Value metrics:
- quote creation time;
- quotes sent;
- pending quotes;
- follow-up SLA;
- overdue invoices;
- days-to-payment;
- admin hours released.

## OpsFlow — P0/P1 commercial offer

Promise: **remove repetitive email/document/data-entry work.**

```text
email/document
→ classify
→ extract
→ validate
→ register
→ task/action/storage
→ exception path
→ telemetry
```

Use cases:
- invoice intake;
- email → task;
- email → CRM;
- attachment classification;
- document renaming/storage;
- structured extraction;
- executive summaries.

## Add-on families

Sell only after discovery indicates real pain:
- appointments + reminders;
- client onboarding;
- customer support/ticketing;
- retention/reviews;
- executive briefs;
- document AI/OCR;
- approvals;
- inventory alerts.

## Delivery model

```text
Discovery / baseline
→ proposal
→ setup fee
→ pilot
→ production acceptance
→ monthly monitoring/support
→ optimization / new flows
```

## Pricing rule

Do not primarily sell engineering hours. Price against delivered operational outcome, implementation complexity, risk, provider costs and ongoing support.

External provider/API/WhatsApp/AI costs should be visible and contractually separated where appropriate.

## Discovery questions

- What do you repeat every day/week?
- What do you copy/paste?
- What enters Excel/Sheets manually?
- What requests get forgotten?
- Where do leads disappear?
- What requires approval?
- Which emails/attachments are manually classified?
- How many units per month?
- Median minutes per unit?
- What happens when the process fails?
- Which system is the source of truth?
- Which action must never be fully automatic?

## Commercial north star

First 3 clients are for evidence, standardization and case studies.

```text
Client 1 → learning
Client 2 → standardization
Client 3 → repeatability/case study
```

Then increase pricing and move recurring patterns into templates.


## Delivery presets

The commercial catalog remains outcome-based; technical presets are only delivery accelerators.

Current zero-cost starting points live in `operations/savings/presets/catalog.json`:

- services/agencies;
- workshops/technical service;
- academies/training;
- backoffice/document handling;
- recurring memberships/contracts;
- lightweight inventory/service operations.

Each preset composes only `APPROVED_BASELINE` Savings Workflows and candidate Google Workspace adapters. It does not include client baseline values, credentials, acceptance or a pricing promise.

Use `pilot_bootstrap.py from-preset` after discovery identifies a fit, then measure the real AS-IS process before quoting savings.
