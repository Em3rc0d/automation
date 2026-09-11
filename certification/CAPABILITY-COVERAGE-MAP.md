# SMB Capability Coverage Map

Status: **CERTIFICATION / ROADMAP AUTHORITY**
Updated: 2026-09-11

This map answers one question:

> Can a new SMB request be assembled from certified reusable pieces, or do we still need new business-semantic code?

It intentionally does **not** optimize for workflow count.

## Coverage states

- `CERTIFIED` — approved baseline evidence exists.
- `IN_CERTIFICATION` — capability is in an active runtime/certification wave.
- `DESIGNED_MINED` — reusable pieces and external evidence are documented, but no approved baseline exists yet.
- `PARTIAL` — important semantic boundaries exist, but common end-to-end cases still require new capability work.
- `GAP` — material common SMB boundary not yet represented sufficiently.

A provider adapter does not change a business capability from GAP to covered unless the business semantic boundary itself exists.

## Canonical 20-family SMB map

| # | Family | Current coverage authority | Status after current W1-W11 program | Main remaining gap |
|---|---|---|---|---|
| 1 | Sales / CRM / Lead Management | W1 + W3 | IN_CERTIFICATION | broader enrichment/reactivation/territory variants as config/adapters |
| 2 | Appointments / Scheduling | W5 | IN_CERTIFICATION | resource pools, waitlists, no-show recovery depth |
| 3 | Quote / Proposal / Contract / Quote-to-Cash | W4 | IN_CERTIFICATION | contract/e-sign regional/provider adapters |
| 4 | Accounts Receivable / Collections | W4 + W10 | IN_CERTIFICATION | dispute handling and collection-policy breadth |
| 5 | AP / Invoices / Receipts / Accounting Documents | W2 + W10 | IN_CERTIFICATION | regional accounting/SUNAT adapters and supplier-specific deterministic extractors |
| 6 | Expenses / Reimbursements | W10 partial | PARTIAL | submission -> policy -> approval -> reimbursement lifecycle |
| 7 | Procurement / PO / Supplier Operations | W9 | IN_CERTIFICATION | supplier scorecards, richer receiving/three-way-match paths |
| 8 | Inventory / Orders / Ecommerce Operations | W9 partial | PARTIAL | order lifecycle, shipping/returns/refunds and channel sync depth |
| 9 | Customer Support / Ticketing / SLA | W7 | IN_CERTIFICATION | knowledge retrieval/reply governance and channel adapters |
| 10 | Client Onboarding / Service Delivery | W8 | IN_CERTIFICATION | project/access/billing provider adapters |
| 11 | HR Administration / Onboarding / Leave / Offboarding | mining/design only | DESIGNED_MINED | production wave required |
| 12 | Smart Inbox / Email / Messaging Ops | W6 | IN_CERTIFICATION | thread semantics, multilingual/sensitive-message policies |
| 13 | Document Lifecycle / Records / Knowledge | W2 partial | PARTIAL | archival/expiry/index/RAG evidence path breadth |
| 14 | Feedback / NPS / Reviews / Retention / Reactivation | partial overlap W3/W7 | PARTIAL | dedicated retention/renewal/reactivation wave |
| 15 | Management Reporting / KPIs / Alerts / Savings | W10 + W11 | IN_CERTIFICATION | reference dashboards/adapters and anomaly evidence |
| 16 | Generic Approvals / Human-in-the-Loop | W1 + W11 | IN_CERTIFICATION | multi-level/escalation policy breadth |
| 17 | Data Sync / Migration / Master Data | W11 partial | PARTIAL | bidirectional sync, conflict resolution, cursor/backfill primitives |
| 18 | Internal IT / Access Operations | W11 partial | PARTIAL | access request/provision/deprovision lifecycle depth |
| 19 | Project / Work Order / Service Operations | W5 + W8 partial | PARTIAL | field-service/work-order lifecycle and maintenance depth |
| 20 | Marketing / Admin Automation | mining/design only | DESIGNED_MINED | dedicated production wave required |

## Post-W11 priority gaps

The following are justified future production waves because they increase coverage, not because a wave number is available.

### Priority A — common SMB gaps

1. **HR Lifecycle**
   - candidate/admin intake (no autonomous hiring decisions)
   - employee onboarding
   - policy acknowledgements
   - leave approval
   - access provisioning/deprovisioning
   - offboarding audit
   - document expiry reminders

2. **Marketing / Retention / Lifecycle Messaging**
   - audience sync
   - campaign lead capture
   - campaign/event lifecycle
   - consent/suppression
   - NPS/CSAT
   - review requests
   - renewal reminders
   - reactivation

3. **Order / Ecommerce / Logistics**
   - order ingest/normalize
   - inventory reservation
   - fulfillment routing
   - shipping/tracking sync
   - returns/refunds
   - abandoned-cart/post-purchase flows

4. **Data / Master Data / Integration Operations**
   - one-way/bidirectional sync
   - field mapping
   - cursors/versioning
   - conflict queue
   - migration/backfill
   - data-quality checks

5. **IT / Access / Internal Operations**
   - access request/approval
   - provision/deprovision
   - integration health
   - credential-expiry alerts
   - incident intake/routing

6. **Work Order / Field Service / Maintenance**
   - request -> work order -> assignment -> SLA -> completion
   - customer notifications
   - preventive maintenance
   - timesheet/effort rollups

### Priority B — cross-cutting depth

7. **Records / Knowledge / RAG with evidence**
8. **Compliance / audit / retention policies**
9. **Cash / treasury / reconciliation depth**
10. **Contract / signature / regional authority adapters**

These are not mandatory as ten separate waves. Capabilities should be grouped only when the group forms a coherent, independently certifiable production wave.

## Reference solution archetypes

The toolbox must eventually assemble these without new business-semantic code:

| Archetype | Target |
|---|---|
| Service-sales engine | lead -> qualification -> CRM -> follow-up -> appointment -> quote -> payment |
| Document accounting | WhatsApp/email -> document -> OCR/extract -> validate -> review -> accounting -> archive |
| Quote-to-cash | quote -> approval -> acceptance -> invoice -> reminders -> payment -> reconcile |
| Appointment/service | request -> availability -> book -> remind -> reschedule/cancel -> post-service |
| Support desk | intake -> dedupe -> priority -> route -> SLA -> draft/approval -> close -> feedback |
| Client onboarding | won -> contract -> workspace/project/tasks -> access -> invoice -> kickoff -> handoff |
| Procure-to-pay | request -> budget/approval -> supplier/PO -> receipt -> match -> AP -> payment |
| Order-to-fulfillment | order -> reserve inventory -> fulfill -> ship -> track -> return/refund -> retention |
| Employee lifecycle | candidate admin -> hire event -> provision -> onboarding -> leave -> offboarding |
| Smart operations inbox | message -> classify -> extract -> task/record -> approval -> archive |
| Management control | events -> aggregate -> KPI -> threshold/anomaly -> brief -> human action |
| Integration operations | webhook -> verify -> dedupe -> transform/sync -> retry -> incident -> audit/usage |

## Toolbox readiness definition

The repository may claim **BROAD_TOOLBOX_READY** only when:

1. every canonical family is at least `PARTIAL`;
2. no Priority-A family remains `GAP` or merely undocumented;
3. at least 10/12 reference archetypes are assemblable without new business-semantic code;
4. all components used by those 10 archetypes are `APPROVED_BASELINE` or explicitly identified adapters/configuration;
5. provider-specific variants are not counted as new capabilities;
6. the certification validator reports no semantic duplicate/admission-policy violations;
7. mining remains open for new evidence and better versions.

`BROAD_TOOLBOX_READY` is deliberately stronger than W11 completion.

## Interpretation

W11 proves breadth of the current production program. It does not prove that the toolbox has finished evolving.

The approved library should grow until composition coverage is broad enough that most normal SMB requests are integration/configuration exercises rather than bespoke workflow development.
