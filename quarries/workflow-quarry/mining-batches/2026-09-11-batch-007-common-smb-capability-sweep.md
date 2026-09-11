# Mining Batch 007 — Common SMB Capability Sweep

Date: 2026-09-11
Scope: broad cross-functional PyME automation use cases, reusable capability decomposition, integration-target quarry.

## Purpose

Previous batches went deep on specific families (LeadFlow, invoices/documents, appointments, support, infrastructure). This sweep deliberately broadens coverage so the library does not overfit early examples.

The quarry now treats these as independent evidence dimensions:

1. business use case;
2. reusable capability;
3. workflow implementation candidate;
4. provider connector/adaptor;
5. open-source integration target/reference architecture;
6. license/provenance;
7. hardening/test gaps.

## Broad market/process taxonomy evidence

### Zapier

- Business owners automation: https://zapier.com/automations/business-owners
- Broad automation role catalog: https://zapier.com/es/automations
- 2026 small-business automation software: https://zapier.com/blog/small-business-automation-software/
- Business automation overview: https://zapier.com/blog/business-automation/

Observed recurring domains: operations/admin, hiring/onboarding, customer follow-up/retention, finance, sales, marketing, customer success, data/analytics, legal and executive work.

### Make

- Platform domains: https://www.make.com/en
- Sales automation 2026: https://www.make.com/en/blog/sales-automation
- Finance automation: https://www.make.com/en/solutions/automate-finance

Observed recurring patterns: lead routing/follow-up/CRM/quotes/reporting; invoice/expense/payroll/approval flows; integration between siloed systems; operations/customer-experience/HR automation.

### Microsoft Power Automate / BPM

- Business process management: https://www.microsoft.com/en-us/power-platform/products/power-automate/topics/business-process/business-process-management-bpm
- Approvals: https://learn.microsoft.com/en-us/power-automate/get-started-approvals
- Business process flow overview: https://learn.microsoft.com/es-es/power-automate/business-process-flows-overview

Observed categories: human-centric approvals, integration-centric system sync, document-centric routing/archive; HR onboarding, expenses, customer complaints, supply chain, maintenance, contracts and quote/order/invoice lifecycles.

Conclusion: the 20-domain capability map in `workflows/SMB-CAPABILITY-LIBRARY.md` is consistent with broad industry automation categories rather than being generated solely from our initial product ideas.

---

# Domain evidence and notable candidates

## Sales / lead operations

### Candidate: Qualify & route leads with DLQ
https://n8n.io/workflows/9739-qualify-and-route-leads-across-channels-with-gpt-4o-slack-and-crm-integration/

Reusable ideas:
- merge email + webhook into one normalized lead pipeline;
- required-field validation;
- dead-letter queue for invalid leads;
- structured extraction;
- deterministic score after extraction;
- CRM route + Slack notification;
- success/failure logging.

Hardening notes:
- retries/backoff are suggested but not intrinsic to template;
- score policy must be tenant configuration;
- AI extraction and deterministic business score should remain separated.

### Candidate: Twenty CRM dedupe/upsert
https://n8n.io/workflows/18696-capture-and-qualify-website-leads-with-n8n-forms-and-twenty-crm/

Reusable ideas:
- raw submission note for audit;
- normalize work email/domain;
- company dedupe by website;
- person dedupe by work email;
- opportunity/task creation only after qualification.

### Candidate: WhatsApp/email lead nurture
https://n8n.io/workflows/15616-nurture-leads-via-email-whatsapp-openai-and-google-sheets-crm/

Reusable ideas:
- channel sequencing;
- CRM/audit touchpoint log;
- delayed WhatsApp follow-up;
- multi-channel lead nurture.

---

## Appointment/scheduling

### Candidate: reliable calendar booking
https://n8n.io/workflows/14824-book-and-manage-appointments-with-google-calendar-and-gmail/

Reusable ideas:
- validate input;
- real-time availability;
- prevent double bookings;
- suggest alternatives;
- confirmations/reminders.

### Candidate: booking persistence in Supabase
https://n8n.io/workflows/18988-manage-medical-appointment-bookings-and-reminders-with-google-sheets-calendar-gmail-and-supabase/

Reusable ideas:
- calendar event ID persistence;
- booking record separate from provider calendar;
- reminder state.

### API/reference quarry: Cal.com
https://github.com/calcom/cal.diy/blob/main/agents/skills/calcom-api/SKILL.md

Useful adapter semantics:
- check slots before booking;
- persist booking UID;
- cancel/reschedule by UID;
- consume booking webhooks;
- exponential backoff for rate limiting.

License caveat: Cal.com is open-core/AGPL with commercial/enterprise distinctions. Treat as integration/reference target pending exact code-path license review.

---

## Quote / proposal / contract

### Quotation PDF
https://n8n.io/workflows/14185-generate-and-send-personalized-quotations-pdf/

### Proposal + ROI + Google Docs
https://n8n.io/workflows/12715-generate-ai-sales-proposals-with-gemini-and-google-docs/

### Contract + e-sign lifecycle
https://n8n.io/workflows/11849-generate-ai-powered-contracts-with-openai-e-signature-gmail-and-sheets/

Reusable synthesis:
- structured commercial inputs;
- deterministic price/ROI calculations;
- document template merge;
- internal approval gate;
- send/e-sign request;
- callback status synchronization;
- reminder/expiry paths;
- final archive/audit.

Hardening rule: AI may draft language, but financial calculations and approved legal clauses should be deterministic/policy-controlled.

---

## Accounts receivable / collections

### Tiered overdue reminders
https://n8n.io/workflows/17878-send-tiered-overdue-invoice-reminders-with-google-sheets-and-gmail/

Reusable ideas:
- aging threshold;
- tier 1/2/3 escalation;
- last-reminder cooldown;
- final-notice escalation to operator;
- write-back of reminder state.

### Weekly overdue reminder
https://n8n.io/workflows/16320-send-weekly-overdue-invoice-reminders-with-google-sheets-and-gmail/

Useful as a minimal non-AI baseline.

---

## AP / documents / invoices / OCR

Already deep-mined in batch 005. Additional relevant workflow families found in this sweep:

- Gmail PDF invoices -> Gemini -> Drive/Sheets: https://n8n.io/workflows/19223-capture-classify-and-log-gmail-pdf-invoices-with-gemini-and-google-drive/
- Drive invoice OCR + accounting/approval/duplicate/vendor patterns: https://n8n.io/workflows/17077-extract-and-validate-invoice-data-from-google-drive-using-ocrspace-gemini-and-google-sheets/
- document classification/rename/deadline: https://n8n.io/workflows/15866-classify-documents-with-gemini-and-organize-them-in-google-drive/
- legal PDF archive/index + failure alerts: https://n8n.io/workflows/17245-archive-and-index-legal-pdfs-from-gmail-with-gemini-sheets-and-google-drive/

Reusable synthesis remains:
`intake -> type validate -> OCR/parser -> structured extract -> arithmetic/schema validation -> duplicate/vendor checks -> confidence -> review or accounting -> archive`.

---

## Expenses / reimbursements

### Gemini expense audit
https://n8n.io/workflows/18919-approve-and-audit-expense-claims-with-google-gemini-and-google-sheets/

Notable patterns:
- webhook/email intake;
- PDF/image normalization;
- policy lookup;
- duplicate detection;
- auto approval only within rules;
- approval link path;
- audit log;
- claim status endpoint.

### Telegram expense receipt workflow
https://n8n.io/workflows/19225-track-employee-expense-receipts-from-telegram-with-gpt-4o-mini-and-google-sheets/

Notable patterns:
- receipt image intake;
- structured extraction/confidence;
- policy + duplicate rules;
- manager approval up to timeout;
- monthly summary.

### Odoo expense approval
https://n8n.io/workflows/18315-submit-and-approve-employee-expenses-with-odoo-slack-and-gmail/

Shows clean external-system adapter semantics: validate employee/category -> create expense -> approval -> state update -> notify.

---

## Procurement / purchase orders / suppliers

### Tiered PO approval + budget check
https://n8n.io/workflows/16404-route-purchase-order-approvals-and-budget-alerts-with-gmail-slack-and-sheets/

Reusable ideas:
- normalized PO request;
- generated PO ID;
- spend-tier approval routing;
- department budget lookup;
- SLA per approval tier;
- requester confirmation and audit.

### PO generation / supplier selection
https://n8n.io/workflows/10680-intelligent-purchase-order-generator-with-ai-supplier-selection/

Useful components:
- supplier database;
- approval threshold;
- PDF generation;
- supplier email;
- Drive archival.

AI supplier selection should be recommendation-only unless the client explicitly approves autonomous policy.

### Supplier risk monitoring
https://n8n.io/workflows/18446-monitor-supplier-risk-daily-with-groq-google-sheets-slack-and-gmail/

Useful as knowledge for supplier-risk alerts; external news/sanctions and LLM risk inference require source quality and review controls.

---

## Inventory / orders / ecommerce

### Ecommerce operations orchestration
https://n8n.io/workflows/6362-automate-e-commerce-orders-inventory-and-feedback-with-slack-sheets-and-gmail/

### WooCommerce orders + inventory sync
https://n8n.io/workflows/11968-sync-woocommerce-orders-and-inventory-with-google-sheets-and-slack/

### Reorder alerts
https://n8n.io/workflows/12874-track-woocommerce-inventory-and-send-reorder-alerts-via-gmail-and-slack/

Reusable decomposition:
- order ingest;
- parse/normalize line items;
- inventory check/reservation;
- fulfillment routing;
- customer/team notification;
- stock synchronization;
- sales-per-SKU aggregation;
- low-stock/reorder threshold.

---

## Customer support / ticketing / SLA

### Gmail/forms support triage
https://n8n.io/workflows/15835-triage-customer-support-tickets-from-gmail-and-forms-with-openai-slack-and-sheets/

### Support with CRM + DLQ
https://n8n.io/workflows/10184-automate-customer-support-with-gpt-4o-slack-and-crm-integration/

### Zendesk intake
https://n8n.io/workflows/8750-create-zendesk-tickets-from-gmail-and-slack-with-google-sheets-tracking/

### Human-approved email reply
https://n8n.io/workflows/10907-multilingual-email-auto-replies-with-deepl-gpt-4o-and-slack-human-approval/

Common reusable pieces:
- omnichannel intake and normalization;
- thread/ticket dedupe;
- category/priority/sentiment;
- SLA assignment;
- ticket create/update;
- KB retrieve;
- response draft;
- human approval for sensitive outbound;
- escalation and closure;
- feedback request.

### OSS integration target: Chatwoot

- https://github.com/chatwoot/chatwoot
- https://github.com/chatwoot/chatwoot/blob/develop/LICENSE
- https://github.com/chatwoot/docs

Current license inspection: core outside `enterprise/` uses MIT; enterprise directory has separate terms. Strong API/integration target for self-hosted omnichannel support/WhatsApp.

---

## Client onboarding

### Full service-business onboarding
https://n8n.io/workflows/12479-create-client-onboarding-projects-contracts-and-slack-channels-from-form-data/

Reusable pieces:
- intake normalization;
- project creation;
- contract generation;
- email delivery;
- internal collaboration channel;
- client record/logging.

### Staged onboarding + guardrail subworkflow
https://n8n.io/workflows/18686-send-staged-client-onboarding-emails-with-clio-and-smtp/

Important pattern: outbound compliance/suppression can be a shared sub-workflow rather than repeated logic in every automation.

---

## HR onboarding/offboarding/access

### New-hire provisioning
https://n8n.io/workflows/16268-provision-new-hire-it-accounts-with-google-workspace-slack-and-gmail/

### Day 0-30 onboarding
https://n8n.io/workflows/14142-onboard-employees-automatically-with-google-workspace-slack-notion-and-gmail/

### Offboarding
https://n8n.io/workflows/16403-manage-employee-offboarding-with-google-workspace-slack-hubspot-and-notion/

Reusable decomposition:
- validate employee identity/start/end data;
- create/disable identity;
- provision/revoke app access;
- task/checklist creation;
- manager/IT notification;
- compliance audit record;
- delayed day 7/30 completion checks.

Hiring decisions are explicitly outside autonomous automation; admin processing/scheduling can be automated.

---

## Feedback / retention

### Closed-ticket feedback request
https://n8n.io/workflows/8752-ai-powered-customer-feedback-collection-with-gpt-4o-google-sheets-and-slack-alerts/

Reusable components:
- trigger on completed service/ticket;
- survey request;
- response intake;
- NPS/CSAT deterministic scoring;
- detractor escalation;
- positive review request;
- reactivation/renewal follow-up.

### OSS integration target: Formbricks

- https://github.com/formbricks/formbricks
- Core AGPL; enterprise separate; repo explicitly calls out white-label restrictions.
- Integration target/reference only unless licensing decision is explicit.

---

## Reporting / KPI / executive briefs

### Daily CFO invoice health
https://n8n.io/workflows/18673-send-daily-cfo-invoice-health-reports-with-google-sheets-groq-gmail-and-slack/

### Weekly KPI summary
https://n8n.io/workflows/19312-send-weekly-kpi-executive-summaries-from-google-sheets-via-gemini-gmail-and-slack/

### ClickUp + Sheets KPI report
https://n8n.io/workflows/9464-sync-kpi-metrics-from-clickup-and-google-sheets-to-slack-and-gmail/

Reusable pattern:
`collect -> normalize -> deterministic KPI/trend calculation -> threshold/anomaly -> optional AI explanation -> persist snapshot -> notify`.

Rule: AI never becomes the source of numeric KPI truth.

---

# OSS integration/reference quarry added by this sweep

## Activepieces

https://github.com/activepieces/activepieces

Current license notes:
- community code outside EE/commercial directories is MIT;
- enterprise directories and incorporated third-party components have separate licenses.

Why mine:
- hundreds of TypeScript pieces/connectors;
- useful provider auth/action/trigger implementation patterns;
- connector code quarry independent of n8n engine choice.

## Twenty CRM

https://github.com/twentyhq/twenty

Why mine:
- modern CRM object/workflow concepts;
- record/manual/schedule/webhook triggers;
- record operations, email, HTTP, code, branches, iteration, AI, delays/forms.

License caveat:
- main product has AGPL/commercial split;
- `twenty-client-sdk` package is MIT.

## ERPNext

https://github.com/frappe/erpnext

Why mine/integrate:
- accounting, inventory, CRM, sales, purchase, order management, support, projects;
- useful API integration target for clients needing more than spreadsheets.

License: GPLv3; prefer integration/reference rather than copying into proprietary control plane.

## Frappe CRM

https://github.com/frappe/crm

Notable built-in integrations: Twilio, Exotel, WhatsApp; ERPNext bridge.

## Chatwoot

https://github.com/chatwoot/chatwoot

Core outside enterprise tree uses MIT according to repo license. Useful support/omnichannel integration target.

## Formbricks

https://github.com/formbricks/formbricks

AGPL core + enterprise; explicit white-label/resale restrictions. Useful survey/NPS integration target, not an assumed embeddable module.

## Cal.com

https://github.com/calcom/cal.com

AGPL/open-core/commercial distinctions. Useful scheduling API reference/integration target; do not assume platform/enterprise code is reusable.

## Invoice Ninja

https://github.com/invoiceninja/invoiceninja
https://github.com/invoiceninja/api-docs

Useful invoicing API target, but source reuse/white-label has commercial/source-available considerations. Keep separate from permissive code quarry.

---

# Resulting architecture principle

Common PyME automations are not modeled as monolithic named solutions. They are compositions of reusable capabilities plus provider adapters.

```text
Capability
  + configuration
  + connector adapters
  + approval policy
  + tenant data
  + tests
  = client AutomationInstance
```

This batch produced the authoritative broad capability map:

- `workflows/SMB-CAPABILITY-LIBRARY.md`
- `workflows/CONNECTOR-MATRIX.md`
- expanded `workflows/n8n/BASELINE-TARGETS.md`

## Next mining behavior

Do not stop at this taxonomy. Continue mining for:

- new capability gaps;
- safer/better implementations;
- connector variants;
- regional/LATAM systems;
- edge cases and failure modes;
- license/provenance evidence;
- test fixtures;
- performance/cost patterns;
- workflows from n8n, GitHub, Gists, videos, blogs, official docs, Make/Zapier/Power Automate examples and other OSS engines.

Every useful discovery must either improve a capability, add a connector, add a test/failure case, or enter `no-pass-verified` with preserved evidence.
