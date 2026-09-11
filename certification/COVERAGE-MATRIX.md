# SMB Automation Coverage Matrix

Status: **CERTIFICATION EVIDENCE**
Updated: 2026-09-11

This matrix defines what “common PyME automation coverage” means for the repository snapshot. It is not a claim that every industry-specific ERP/regulatory process is implemented.

| # | Domain family | Capability map | External evidence mined | Connector abstraction | Baseline certification |
|---:|---|---|---|---|---|
| 1 | Sales / CRM / Leads | COVERED | YES | YES | TARGET / not yet production-approved |
| 2 | Appointments / Scheduling | COVERED | YES | YES | TARGET |
| 3 | Quotes / Proposals / Contracts / Q2C | COVERED | YES | YES | TARGET |
| 4 | Accounts Receivable / Collections | COVERED | YES | YES | TARGET |
| 5 | Accounts Payable / Invoices / Receipts | COVERED | YES | YES | TARGET |
| 6 | Expenses / Reimbursements | COVERED | YES | YES | TARGET |
| 7 | Procurement / Purchase Orders / Suppliers | COVERED | YES | YES | TARGET |
| 8 | Inventory / Orders / Ecommerce Operations | COVERED | YES | YES | TARGET |
| 9 | Customer Support / Ticketing / SLA | COVERED | YES | YES | TARGET |
| 10 | Client Onboarding / Service Delivery | COVERED | YES | YES | TARGET |
| 11 | HR Admin / Onboarding / Leave / Offboarding | COVERED | YES | YES | TARGET |
| 12 | Smart Inbox / Email / Messaging | COVERED | YES | YES | TARGET |
| 13 | Document Lifecycle / Records / Knowledge | COVERED | YES | YES | TARGET |
| 14 | Feedback / NPS-CSAT / Reviews / Retention | COVERED | YES | YES | TARGET |
| 15 | Management Reporting / KPIs / Savings | COVERED | YES | YES | TARGET |
| 16 | Generic Approvals / Human-in-the-loop | COVERED | YES | YES | PLATFORM PRIMITIVE TARGET |
| 17 | Data Sync / Migration / Master Data | COVERED | PATTERN-LEVEL | YES | TARGET |
| 18 | Internal IT / Access Operations | COVERED | YES | YES | TARGET |
| 19 | Project / Work Order / Service Operations | COVERED | YES | YES | TARGET |
| 20 | Marketing / Admin Automation | COVERED | YES | YES | LOWER-PRIORITY TARGET |

Authority: `workflows/SMB-CAPABILITY-LIBRARY.md`, `workflows/CONNECTOR-MATRIX.md`, mining batches 001–008, `mining-site/SOURCES.md`.

## What is intentionally not generic platform scope

The following remain **integration domains** unless repeated client evidence justifies a dedicated module:

- full general ledger/accounting suite;
- payroll/tax filing engines;
- full ERP/MRP/manufacturing planning;
- clinical record systems;
- banking/payment core;
- POS/ecommerce platform replacement;
- regulated legal-signature authority;
- tax/compliance determination engines;
- logistics/TMS/WMS replacement.

We can automate around these systems through connectors, validation, approvals, synchronization and reporting without claiming to replace them.

## Coverage certification rule

A domain family is `COVERED` at the knowledge/design level only when:

1. reusable capability keys are enumerated;
2. at least one external/official pattern or authoritative source supports the family;
3. hardening/side-effect concerns are documented where material;
4. required provider behavior can be expressed through connector capabilities rather than one hard-coded vendor;
5. the domain maps to common platform contracts (`ProcessRecord`, `BusinessAction`, `ApprovalRequest`, `ExecutionEvent`, `SavingsEvent`) without requiring a new core model.

## Production distinction

`COVERED != APPROVED_BASELINE`.

The matrix certifies repository **coverage and design readiness**, not runtime correctness. A workflow becomes production-reusable only after the quarry pipeline reaches:

```text
DISCOVERED
→ LICENSE_CHECKED
→ INSPECTED
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
```

This distinction is mandatory in every certification statement.
