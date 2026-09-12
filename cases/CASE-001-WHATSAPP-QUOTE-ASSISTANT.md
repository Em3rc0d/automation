# CASE-001 — WhatsApp Quote Assistant for an Industrial-Paint Salesperson

Status: **PRODUCTIVE PILOT DESIGN**  
Case type: **Assembly / coverage proof**  
Primary user: **individual B2B/B2C salesperson**  
Customer channel: **WhatsApp**  
External source of truth: **employer SAP for product/stock/commercial source data available to the salesperson**  
AI provider for the pilot: **Google Gemini using a client-owned API key**

---

## 1. Business context

The user is an individual salesperson who sells industrial paints to B2B and B2C customers. Customers request quotations throughout the day through WhatsApp.

The salesperson already works inside an employer environment where SAP contains product and stock information. The automation is purchased for the salesperson, not by the employer, so the first productive version MUST NOT assume privileged SAP integration or write access.

The salesperson may export an authorized CSV/XLSX report from SAP and upload it to the automation. SAP remains the authoritative source for stock/source data; the automation stores a timestamped snapshot for quotation support.

The business problem is not "build another ERP". It is:

> Reduce the repetitive work required to prepare accurate WhatsApp quotations while preserving the salesperson's commercial judgment for exceptions.

---

## 2. Productive outcome

A customer should be able to write a natural WhatsApp message such as:

```text
Cotízame 30 galones del epóxico gris que me vendiste la vez pasada.
```

The system should:

1. identify the WhatsApp customer;
2. understand the requested product, quantity and references to previous business;
3. retrieve prior quotations and known commercial context;
4. resolve the requested product against the latest SAP-derived snapshot;
5. check current stock/source data freshness;
6. deterministically calculate the proposed quotation using current policy and data;
7. route only exceptions to the salesperson for approval;
8. generate the quotation document/message;
9. deliver it through WhatsApp;
10. persist the new quote and outcome for future reference.

The goal is to avoid asking the salesperson for information the system already has, while never treating historical conditions as automatically valid when current data or policy has changed.

---

## 3. System boundary

### Inside Automation

- WhatsApp message intake and delivery orchestration;
- customer identity resolution;
- conversation/thread persistence;
- quote request normalization;
- quote-history lookup;
- commercial-profile lookup;
- SAP CSV/XLSX snapshot import and normalization;
- deterministic quote calculation;
- policy/exception checks;
- salesperson approval when required;
- quote document generation;
- quote delivery/follow-up;
- audit trail, telemetry and incident handling.

### External systems / authorities

- **WhatsApp Business Platform** — customer interaction channel;
- **SAP** — employer-owned system and authoritative source for product/stock data available to the salesperson;
- **Gemini API** — language understanding only;
- **authoritative FX source / configured FX policy** — PEN/USD when applicable;
- **Peru tax policy / authoritative SUNAT-backed configuration** — IGV and regional tax treatment when applicable.

### Explicit non-goals for V1

- writing back to SAP;
- modifying employer master data;
- replacing SAP/ERP;
- autonomous negotiation outside configured commercial limits;
- letting an LLM calculate authoritative totals, tax, discounts, margins or credit exposure;
- full accounting/fiscal bookkeeping;
- company-wide sales management;
- direct SAP API integration unless the employer explicitly authorizes and exposes it.

---

## 4. Productive architecture

```text
CUSTOMER
  |
  | WhatsApp
  v
messaging.receive
  |
  v
MESSAGE_INTAKE / conversation context
  |
  v
Gemini intent + entity extraction
  |
  +-----------------------------+
  |                             |
  v                             v
Customer / quote history     SAP-derived snapshot
commercial context           CSV/XLSX -> import/transform
  |                             |
  +-------------+---------------+
                |
                v
          QUOTE_REQUEST
                |
                v
          QUOTE_CALCULATE
                |
                v
       deterministic policy checks
       price / discount / margin
       credit / tax / currency
                |
          +-----+-----+
          |           |
       allowed     exception
          |           |
          |      APPROVAL_REQUEST
          |           |
          +-----+-----+
                |
                v
        QUOTE_GENERATE_DOC
                |
                v
          QUOTE_DELIVER
                |
                v
         messaging.send
                |
                v
             CUSTOMER
```

A small private web surface is permitted for administration/import only. The salesperson's daily operating interface remains WhatsApp.

---

## 5. Repository capabilities reused

### Messaging / channel adapters

From `workflows/CONNECTOR-MATRIX.md`:

- `messaging.receive`
- `messaging.send`
- `messaging.thread.read`
- optional `messaging.media.download`
- initial provider target: Meta WhatsApp Cloud API

WhatsApp is an adapter choice, not a new business capability.

### Customer / CRM memory

From the existing CRM surface:

- `CRM_UPSERT_CONTACT@1`
- provider-neutral customer/company lookup/upsert through CRM connector contracts;
- CRM activity/audit logging for commercial touchpoints.

For a single-salesperson pilot, Supabase/Postgres MAY be used as the lightweight customer-memory implementation instead of deploying a heavyweight CRM.

### Quote-to-cash family

From `workflows/SMB-CAPABILITY-LIBRARY.md`:

- `QUOTE_REQUEST@1`
- `QUOTE_CALCULATE@1`
- `QUOTE_APPROVAL@1`
- `QUOTE_GENERATE_DOC@1`
- `QUOTE_DELIVER@1`
- `QUOTE_FOLLOWUP@1`
- `QUOTE_ACCEPTANCE_CAPTURE@1`

The pilot uses the quote portion only. Invoice/payment automation is out of V1 unless explicitly added later.

### External data import / SAP snapshot

From Data Synchronization / Master Data:

- `ENTITY_SYNC_ONE_WAY@1`
- `FIELD_MAP_TRANSFORM@1`
- `BACKFILL_IMPORT@1`
- `DATA_QUALITY_CHECK@1` when promoted/available for the assembly

The direction is intentionally one-way:

```text
SAP/export -> Automation
```

not:

```text
Automation -> SAP
```

### Inventory validation

- `INVENTORY_CHECK@1`

For this case it answers whether the requested product/quantity is supported by the latest imported SAP snapshot. It does not make Automation the inventory system of record.

### Human-in-the-loop / operations

- `APPROVAL_REQUEST@1`
- `HUMAN_REVIEW_TASK@1`
- `EXECUTION_TELEMETRY@1`
- `ERROR_TO_INCIDENT@1`

Approvals are exception-driven rather than required for every quote.

---

## 6. AI boundary — Gemini

Gemini is used to interpret natural-language WhatsApp messages and return structured intent/entities.

Example input:

```text
Dame 40 del mismo azul que le cotizamos a ABC el mes pasado.
```

Expected structured interpretation:

```json
{
  "intent": "quote_request",
  "quantity": 40,
  "customerReference": "ABC",
  "productReference": {
    "description": "azul",
    "lookupPreviousQuote": true
  }
}
```

Gemini MUST NOT be the arithmetic or policy authority for:

- price;
- tax;
- discount;
- margin;
- credit exposure;
- FX arithmetic;
- final totals.

The Gemini API key is stored as a tenant/client secret reference and MUST NOT be committed to the repository, embedded in exported workflows, or stored as plaintext business data.

---

## 7. Minimum data model

### Customer

```text
id
whatsappPhone
name
companyName?
customerType: B2B | B2C
createdAt
updatedAt
```

### CommercialProfile

```text
customerId
preferredCurrency
usualDiscountPct?
paymentTermsDays?
creditEnabled?
creditLimit?
minimumMarginPolicyRef?
assignedSalesperson
lastReviewedAt
```

Historical values are context; policy must still be evaluated using current configuration.

### Quote

```text
id
customerId
status
currency
fxRate?
fxSource?
fxObservedAt?
subtotal
discountTotal
taxTotal
total
paymentTermsDays?
requiresApproval
approvedBy?
createdAt
sentAt?
acceptedAt?
rejectedAt?
```

### QuoteLine

```text
quoteId
sku
productDescription
quantity
unitOfMeasure
listUnitPrice
quotedUnitPrice
discountPct?
sourceSnapshotId
```

### ProductSnapshot

```text
snapshotId
source: SAP_EXPORT
sourceFileName
importedAt
sourceObservedAt?
sku
description
stock
unitOfMeasure?
basePrice?
currency?
cost?
warehouse?
```

Fields depend on what the authorized SAP export actually contains. The system MUST NOT invent unavailable fields.

### Conversation / Message

```text
conversationId
providerThreadId
customerId
providerMessageId
direction
body
receivedAt
intent?
quoteId?
```

---

## 8. Commercial policy model

The first productive pilot needs explicit configuration for the rules actually used by the salesperson. These values are tenant/client policy, not hard-coded workflow variants.

Candidate policy fields include:

```text
defaultCurrency
allowedCurrencies
usualDiscountByCustomerOrSegment
maxAutoDiscountPct
minimumMarginPct
approvalMarginPct
paymentTermsDays
creditLimit
quoteValidityDays
igvPolicyRef
fxPolicyRef
staleSapSnapshotThreshold
```

The exact policy set MUST be derived from the salesperson's real operating rules before production activation.

### Historical quote principle

```text
previous quote = commercial reference
current source data + current policy = calculation authority
```

A previous unit price can be suggested or compared, but MUST NOT silently override current cost/price/policy.

---

## 9. Discovered coverage gaps

CASE-001 is intentionally used to test the breadth of the toolbox. The core orchestration is already represented, but the case exposes reusable semantic/data gaps that require review before claiming full coverage.

### Gap A — customer commercial profile

Need a stable provider-neutral representation for reusable commercial conditions such as:

- usual/approved discounts;
- payment terms;
- preferred currency;
- credit limits/conditions;
- salesperson assignment;
- policy references.

This may remain a data/config model rather than become a new capability if no independent semantic action is required.

### Gap B — quote-history lookup as decision context

Existing quote capabilities create/manage quotes, but productive reuse requires a deterministic lookup of previous quotes/lines/outcomes for a customer/product reference.

Candidate semantic boundary for review:

```text
QUOTE_HISTORY_LOOKUP
```

Do not admit as a new capability until the repository admission test confirms it cannot be represented cleanly as data access/configuration inside `QUOTE_CALCULATE`.

### Gap C — pricing / margin policy evaluation

The existing library requires deterministic price/tax/discount arithmetic, but CASE-001 requires explicit policy semantics for minimum margin and discount exceptions.

Candidate boundary for review:

```text
PRICING_POLICY_EVALUATE
```

This is potentially reusable across distributors, importers, industrial suppliers, spare-parts sellers and other B2B/B2C commerce verticals.

### Gap D — credit policy evaluation

The repository is strong after invoicing in AR/collections, but this case needs pre-quote/pre-sale evaluation of credit conditions.

Candidate boundary for review:

```text
CREDIT_POLICY_EVALUATE
```

### Gap E — FX source/rate snapshot

The case needs deterministic PEN/USD handling when a quote currency differs from the commercial/base currency.

This may be best represented as an adapter/infrastructure contract plus policy rather than a business capability:

```text
fx.rate.read
```

The quote MUST persist the rate, source and observation timestamp used for the calculation.

### Gap F — SAP adapter

No direct SAP adapter is required for V1. `CSV/XLSX export -> import` is sufficient for the pilot.

A future SAP API adapter is justified only with employer authorization and a known supported interface.

---

## 10. Private import surface

The first productive pilot SHOULD expose a minimal authenticated web surface for the salesperson to upload the SAP export.

Minimum UX:

```text
SAP product/stock snapshot

Last successful import: 2026-09-11 18:40
File: stock_2026-09-11.xlsx
Rows accepted: 1,482
Rows rejected: 3

[ Upload CSV/XLSX ]
```

The uploader is an administration/import surface, not the salesperson's main CRM.

Required behavior:

- authenticated access;
- accepted file type/size policy;
- schema mapping/validation;
- row-level rejection report;
- duplicate/import idempotency handling;
- timestamp of import and source observation when available;
- immutable reference from each quote line to the source snapshot used;
- no secrets inside uploaded files or logs by design.

Alternative ingestion through Drive/email/WhatsApp MAY be evaluated later, but the private uploader is preferred for the first controlled pilot.

---

## 11. Exception policy

A quote SHOULD proceed without human approval when all required data is resolved and all deterministic policies pass.

Human review is required when, for example:

- product resolution is ambiguous;
- requested quantity exceeds the latest known stock policy;
- SAP snapshot is stale beyond configured tolerance;
- requested discount exceeds automatic authority;
- calculated margin falls below the configured threshold;
- credit conditions are outside configured policy;
- FX source/rate is unavailable or stale;
- a required tax/commercial field is missing;
- Gemini extraction confidence/structure is insufficient for safe resolution.

The system must explain *why* approval is required using inspectable facts, not an opaque AI score.

---

## 12. Productive pilot acceptance criteria

The pilot is considered successful only when all of the following are demonstrated with realistic data:

1. WhatsApp customer identity is resolved consistently.
2. At least 10–20 historical quotations can be imported/represented and queried.
3. A real SAP CSV/XLSX export can be imported without manual database edits.
4. Product references such as SKU, description and "same as last time" can be resolved or safely escalated.
5. Current snapshot data is distinguishable from historical quote data.
6. Deterministic calculations reproduce the expected manual quotation for agreed fixtures.
7. Discount/margin/tax/currency rules are testable independently from Gemini.
8. An exception routes to the salesperson and cannot be sent as approved before resolution.
9. A successful quote can be generated and delivered through WhatsApp.
10. The quote persists the exact inputs/snapshot/rules used to derive it.
11. Duplicate WhatsApp/webhook events do not create duplicate quotes or duplicate sends.
12. Provider/API failures enter a visible retry/incident path instead of silently losing the request.

---

## 13. Test scenarios

Minimum acceptance fixtures:

```text
A. "Cotízame 30 del epóxico azul."
B. "Dame lo mismo que le cotizamos a ABC la semana pasada pero 50 unidades."
C. "¿Cuánto me sale en soles?"
D. "Hazme precio por 100 galones."
E. "El cliente quiere 10% de descuento."
F. "¿Tenemos stock para 80?"
G. Product is ambiguous between two SKUs.
H. Latest SAP snapshot is stale.
I. Requested discount violates policy.
J. Margin falls below threshold.
K. Customer is unknown.
L. Duplicate WhatsApp webhook is received.
```

For each fixture capture expected structured input, source-data snapshot, deterministic result, approval decision, final WhatsApp response and audit events.

---

## 14. Initial implementation stack

The first productive pilot is expected to use:

```text
WhatsApp Business Platform
+ n8n orchestration
+ Supabase/Postgres
+ Gemini API (client-owned key)
+ SAP CSV/XLSX import
+ deterministic quote/policy code
+ PDF/document rendering
+ small authenticated import surface
```

Provider choices remain adapters. Business semantics MUST remain reusable and provider-neutral.

---

## 15. Commercial framing

Customer-facing offer:

> **WhatsApp quotation assistant for a salesperson:** remembers prior commercial context, combines it with the salesperson's latest authorized SAP export, prepares a current quotation, and asks for human approval only when a commercial rule is exceeded.

Do not market the pilot as an autonomous sales agent or SAP replacement.

Primary value hypotheses to measure:

- time saved per quotation;
- median first-response time;
- percentage of quotes prepared without manual re-entry;
- percentage of requests requiring human exception handling;
- quote error/rework rate;
- quote follow-up completion rate;
- acceptance/conversion outcome only as a secondary metric unless causality can be established.

---

## 16. Evidence required before promotion

CASE-001 remains a **PRODUCTIVE PILOT DESIGN** until it has:

- real sanitized SAP-export fixtures;
- real/sanitized historical quote fixtures;
- documented client commercial rules;
- WhatsApp adapter acceptance evidence;
- deterministic calculation tests;
- exception/approval tests;
- duplicate/retry/provider-failure tests;
- pilot execution evidence;
- rollback/runbook notes.

Successful delivery may provide evidence for promotion or refinement of the reused capability packages and for admission of any genuinely reusable gaps discovered above.
