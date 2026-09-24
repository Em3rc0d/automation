# Active Work Reducers

Status: **DESIGN AUTHORITY**  
Updated: 2026-09-24

An **Active Work Reducer** is an internal reusable pattern that removes or compresses repetitive human handling time. It is not itself necessarily a customer-facing product.

Relationship:

```text
CAPABILITY
   ↓
ACTIVE WORK REDUCER
   ↓
SAVINGS WORKFLOW
   ↓
PLUGIN / CLIENT INSTALLATION
   ↓
SavingsBaseline + SavingsEvents
```

A Savings Workflow may compose several reducers. The customer is charged for an operational outcome, not for reducer count.

## Reducer classes

| Reducer | Human work reduced | Typical examples | Default runtime |
|---|---|---|---|
| INTAKE | opening channels and manually registering inbound work | lead, ticket, invoice, order | function |
| NORMALIZE | cleaning/reformatting fields | phone, customer, SKU, dates | function |
| DEDUPE | searching for duplicates | leads, invoices, tickets | function |
| LOOKUP | opening a source system and searching a record | payment status, stock, order status | function |
| SELF_SERVICE_QUERY | answering repeated status questions | supplier invoice, vehicle status | function |
| CLASSIFY | reading and categorizing | email, document, support ticket | function |
| EXTRACT | copying fields from unstructured input | invoice/CV/receipt | heavy/function |
| VALIDATE | checking completeness/rules/arithmetic | invoice totals, required fields | function |
| MATCH | comparing two or more records | PO match, payment match, 3-way match | function |
| CALCULATE | deterministic calculation | aging, quote totals, KPI | function |
| GENERATE | producing structured artifacts | quote, PO, contract, report | function |
| ROUTE | deciding destination/owner from rules | lead, ticket, approval | function |
| ASSIGN | assigning work/resource | salesperson, technician | function |
| SCHEDULE | creating/updating time-based work | appointment, kickoff | durable |
| REMIND | checking upcoming obligations and messaging | appointment, payment, training | scheduled |
| FOLLOW_UP | repeated contact until state changes or policy ends | lead, quote, collections | durable/scheduled |
| REACTIVATE | finding dormant entities and contacting them | leads, customers | scheduled |
| NOTIFY | sending a message when state changes | order, vehicle, supplier | function |
| WATCHDOG | scanning for overdue/missing/forgotten work | SLA, onboarding, material | scheduled |
| SYNC | copying approved state between systems | CRM, inventory, payment | function/durable |
| RECONCILE | matching source/target transactions | payments, invoices | function |
| ARCHIVE | renaming/storing/indexing records | PDFs, contracts | function |
| REPORT | recurring aggregation and delivery | AR weekly, KPI brief | scheduled |
| APPROVAL_ORCHESTRATE | asking a human only for exceptions | discount, refund, access | human_loop |
| EXCEPTION_QUEUE | converting unresolved automation cases into actionable human work | OCR low confidence, sync conflict | human_loop |
| PROVISION | creating configured accounts/resources | employee/client setup | function |
| DEPROVISION | revoking accounts/resources | employee offboarding | function |
| BATCH_TRANSFORM | large historical imports/transforms | backfills, migration | heavy |
| HEALTH_CHECK | testing connectors and surfacing degraded state | OAuth/API connectivity | scheduled |
| SAVINGS_METER | recording automated units, exceptions and variable cost | all commercial workflows | function |

## Admission rule

A reducer is useful only when it can be reused across several workflows. Provider-specific details remain adapters/configuration.

Do **not** count reducer steps independently as savings when they are part of one manual business unit. Example:

```text
Read request        2 min
Lookup customer     2 min
Calculate quote     5 min
Generate PDF        3 min
Send                1 min
-------------------------
Manual quote unit  13 min
```

The Savings Engine baseline is **13 minutes per quote**, not five separate savings claims.

## Runtime economics

Reducers must prefer the cheapest runtime that preserves quality:

1. local/mock execution while pre-revenue;
2. shared short-lived function execution for event work;
3. shared scheduling for periodic work;
4. durable orchestration only when waiting/retries are required;
5. heavy compute only when justified and metered;
6. dedicated per-tenant runtime only by explicit exception.

Quality requirements remain unchanged: schema validation, tenant isolation, idempotency, retry policy, exception path, audit, telemetry and rollback.
