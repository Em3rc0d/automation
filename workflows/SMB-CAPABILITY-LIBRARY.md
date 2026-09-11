# SMB Automation Capability Library

Status: **MINING / DESIGN AUTHORITY**
Updated: 2026-09-11

This file defines the reusable capability inventory we want to mine, harden, test, and eventually promote into `APPROVED_BASELINE` packages.

The commercial goal is not to maintain one giant workflow per client. The goal is to assemble client solutions from small, versioned capabilities with stable contracts and connector-specific adapters.

```text
Client need
  -> select capability blocks
  -> bind connectors
  -> configure business rules
  -> run acceptance tests
  -> deploy AutomationInstance
```

## Capability package contract

Every reusable capability promoted beyond `INSPECTED` should document at least:

- `key` and semantic version;
- business purpose and non-goals;
- input contract;
- output contract;
- `ProcessRecord` entity/status mapping;
- `BusinessAction` side effects;
- idempotency key strategy;
- retry/backoff policy;
- timeout policy;
- DLQ / exception path;
- human approval policy;
- required connector capabilities rather than vendor names where possible;
- configuration schema;
- secret references/scopes;
- tenant-isolation assumptions;
- audit events;
- execution telemetry;
- savings baseline mapping;
- fixtures for happy path, malformed input, duplicates, provider errors and permission expiry;
- test evidence and rollback notes.

Vendor-specific nodes should be adapters. Business semantics should stay stable.

---

# 1. Sales, CRM and Lead Management

## Reusable pieces

- `LEAD_CAPTURE@1` — webhook/form/email/ads/WhatsApp intake into normalized lead envelope.
- `LEAD_NORMALIZE@1` — normalize names, phones, emails, company/domain, source, timestamps.
- `LEAD_DEDUPE@1` — deterministic duplicate search before create/update.
- `LEAD_ENRICH@1` — optional enrichment adapter; never required for core capture.
- `LEAD_SCORE@1` — transparent deterministic score with optional AI-extracted signals.
- `LEAD_ROUTE@1` — territory/service/priority/round-robin assignment.
- `CRM_UPSERT_CONTACT@1` — provider-neutral contact/company upsert.
- `CRM_CREATE_OPPORTUNITY@1` — opportunity/deal creation when qualification gate passes.
- `LEAD_ACKNOWLEDGE@1` — immediate email/WhatsApp/SMS acknowledgement.
- `LEAD_NOTIFY_OWNER@1` — notify assigned salesperson/operator.
- `LEAD_FOLLOWUP_WATCHDOG@1` — find leads with no action within SLA.
- `LEAD_NURTURE_SEQUENCE@1` — staged follow-up with opt-out/suppression checks.
- `LEAD_REACTIVATE@1` — re-engage dormant/lost leads under client policy.
- `LEAD_HANDOFF_TO_APPOINTMENT@1` — qualified lead -> booking request.
- `LEAD_AUDIT_TRAIL@1` — immutable/logical touchpoint history.

## Mined evidence

- n8n lead qualification/routing with DLQ, deterministic score, CRM and Slack: https://n8n.io/workflows/9739-qualify-and-route-leads-across-channels-with-gpt-4o-slack-and-crm-integration/
- n8n Twenty CRM lead normalization and dedupe: https://n8n.io/workflows/18696-capture-and-qualify-website-leads-with-n8n-forms-and-twenty-crm/
- n8n Follow Up Boss + Gmail + Twilio/WhatsApp follow-up: https://n8n.io/workflows/9738-automated-lead-follow-up-with-follow-up-boss-gmail-twilio-and-whatsapp-messaging/
- Make 2026 sales automation explicitly includes lead capture/routing, CRM updates, follow-up, quotes and reporting: https://www.make.com/en/blog/sales-automation

## Hardening rules

- AI may extract intent/signals but score thresholds must remain inspectable and configurable.
- CRM create paths must dedupe first.
- Message sends require channel suppression/consent policy when applicable.
- Follow-up must be idempotent and use a persisted next-action timestamp.

---

# 2. Appointments and Scheduling

## Reusable pieces

- `APPOINTMENT_REQUEST@1`
- `APPOINTMENT_VALIDATE_REQUEST@1`
- `AVAILABILITY_CHECK@1`
- `SLOT_HOLD@1`
- `APPOINTMENT_CREATE@1`
- `APPOINTMENT_CONFIRM@1`
- `APPOINTMENT_REMIND@1`
- `APPOINTMENT_RESCHEDULE@1`
- `APPOINTMENT_CANCEL@1`
- `WAITLIST_FILL@1`
- `NO_SHOW_RECOVERY@1`
- `APPOINTMENT_POST_VISIT@1`

## Mined evidence

- Real-time availability, double-booking prevention, alternative slots, confirmations/reminders: https://n8n.io/workflows/14824-book-and-manage-appointments-with-google-calendar-and-gmail/
- Sheets -> Calendar availability -> Supabase -> confirmations/reminders: https://n8n.io/workflows/18988-manage-medical-appointment-bookings-and-reminders-with-google-sheets-calendar-gmail-and-supabase/
- Cal.com API pattern: slots -> create booking -> persist UID -> webhooks for created/cancelled events: https://github.com/calcom/cal.diy/blob/main/agents/skills/calcom-api/SKILL.md

## Hardening rules

- Availability check and booking must account for race conditions.
- Persist provider booking/event ID.
- Reschedule/cancel are state transitions, not new anonymous events.
- Timezone is explicit at tenant and attendee level.

---

# 3. Quote, Proposal, Contract and Quote-to-Cash

## Reusable pieces

- `QUOTE_REQUEST@1`
- `QUOTE_CALCULATE@1`
- `QUOTE_GENERATE_DOC@1`
- `QUOTE_APPROVAL@1`
- `QUOTE_DELIVER@1`
- `QUOTE_FOLLOWUP@1`
- `QUOTE_ACCEPTANCE_CAPTURE@1`
- `PROPOSAL_GENERATE@1`
- `CONTRACT_GENERATE_FROM_TEMPLATE@1`
- `CONTRACT_REVIEW_GATE@1`
- `ESIGN_SEND@1`
- `ESIGN_STATUS_SYNC@1`
- `CUSTOMER_CREATE_FROM_WIN@1`
- `DEPOSIT_REQUEST@1`
- `INVOICE_CREATE_FROM_WIN@1`
- `PAYMENT_LINK_CREATE@1`
- `PAYMENT_STATUS_SYNC@1`

## Mined evidence

- Quotation PDF generation and delivery: https://n8n.io/workflows/14185-generate-and-send-personalized-quotations-pdf/
- Sales proposal generation from structured form + ROI + Google Docs: https://n8n.io/workflows/12715-generate-ai-sales-proposals-with-gemini-and-google-docs/
- Contract request -> template routing -> e-sign -> callback -> status/logging: https://n8n.io/workflows/11849-generate-ai-powered-contracts-with-openai-e-signature-gmail-and-sheets/
- Microsoft business-process example explicitly models Opportunity -> Quote -> Order -> Invoice: https://learn.microsoft.com/es-es/power-automate/business-process-flows-overview

## Hardening rules

- Price/tax/discount calculation is deterministic; AI never owns arithmetic authority.
- Contract text should come from approved templates/clauses; AI generation requires explicit client/legal policy.
- Signature webhooks require signature verification and replay protection.

---

# 4. Accounts Receivable and Collections

## Reusable pieces

- `AR_IMPORT_OPEN_INVOICES@1`
- `AR_AGING_CALCULATE@1`
- `PAYMENT_REMINDER@1`
- `PAYMENT_ESCALATION@1`
- `PAYMENT_RECEIVED_SYNC@1`
- `PAYMENT_RECONCILE@1`
- `COLLECTION_OWNER_ALERT@1`
- `AR_WEEKLY_SUMMARY@1`
- `DISPUTE_INTAKE@1`

## Mined evidence

- Tiered reminders based on overdue days + last reminder state: https://n8n.io/workflows/17878-send-tiered-overdue-invoice-reminders-with-google-sheets-and-gmail/
- Weekly overdue reminder state transition: https://n8n.io/workflows/16320-send-weekly-overdue-invoice-reminders-with-google-sheets-and-gmail/
- Finance automation reference: Make lists invoicing, expenses and finance approvals as common automation targets: https://www.make.com/en/solutions/automate-finance

## Hardening rules

- Reminder policy is configuration, not code.
- Never send twice for the same invoice+tier+policy period.
- Final-notice/legal escalation must support human approval.

---

# 5. Accounts Payable, Invoices, Receipts and Accounting Documents

## Reusable pieces

- `DOCUMENT_INTAKE@1`
- `MEDIA_DOWNLOAD@1`
- `DOCUMENT_CLASSIFY@1`
- `DOCUMENT_TEXT_EXTRACT@1`
- `RECEIPT_OCR_EXTRACT@1`
- `INVOICE_OCR_EXTRACT@1`
- `ACCOUNTING_NORMALIZE@1`
- `DOCUMENT_ARITHMETIC_VALIDATE@1`
- `DOCUMENT_DUPLICATE_DETECT@1`
- `VENDOR_VALIDATE@1`
- `PO_MATCH@1`
- `INVOICE_APPROVAL_ROUTE@1`
- `ACCOUNTING_EXPORT@1`
- `DOCUMENT_ARCHIVE@1`
- `DOCUMENT_EXCEPTION_REVIEW@1`
- `CPE_VALIDATE_PERU@1` — regional adapter; authority must be SUNAT documentation/API behavior, not OCR output.

## Mined evidence

- WhatsApp receipt OCR family already logged in batch 005.
- `ivansiyanko/n8n-invoice-ai` importable MIT workflow already INSPECTED.
- `invoice2data` MIT deterministic supplier-template extraction baseline.
- Paperflow confidence + arithmetic/source validation + human review/evals pattern.
- Gmail invoice classification + Drive + Sheets: https://n8n.io/workflows/19223-capture-classify-and-log-gmail-pdf-invoices-with-gemini-and-google-drive/
- Document classification/renaming/deadline extraction: https://n8n.io/workflows/15866-classify-documents-with-gemini-and-organize-them-in-google-drive/
- Expense/AP validation and accounting integration pattern: https://n8n.io/workflows/17077-extract-and-validate-invoice-data-from-google-drive-using-ocrspace-gemini-and-google-sheets/

## Hardening rules

- Use deterministic extraction for known suppliers when possible; LLM/VLM as fallback/augmentation.
- Validate totals (`subtotal + tax - discount ~= total`) within currency-safe tolerance.
- Persist document hash and semantic invoice duplicate key.
- Low confidence never silently posts to accounting.

---

# 6. Expenses and Reimbursements

## Reusable pieces

- `EXPENSE_SUBMIT@1`
- `RECEIPT_EXTRACT@1`
- `EXPENSE_POLICY_CHECK@1`
- `EXPENSE_DUPLICATE_CHECK@1`
- `EXPENSE_AUTO_APPROVE@1`
- `EXPENSE_MANAGER_APPROVAL@1`
- `EXPENSE_REGISTER@1`
- `EXPENSE_REIMBURSEMENT_STATUS@1`
- `EXPENSE_MONTHLY_REPORT@1`

## Mined evidence

- Receipt/email -> Gemini -> policy + duplicate checks -> manager approval -> audit: https://n8n.io/workflows/18919-approve-and-audit-expense-claims-with-google-gemini-and-google-sheets/
- Telegram receipt intake -> OCR -> policy -> manager approval -> monthly report: https://n8n.io/workflows/19225-track-employee-expense-receipts-from-telegram-with-gpt-4o-mini-and-google-sheets/
- Odoo expense creation + Slack approval + employee notification: https://n8n.io/workflows/18315-submit-and-approve-employee-expenses-with-odoo-slack-and-gmail/

---

# 7. Procurement, Purchase Orders and Supplier Operations

## Reusable pieces

- `PURCHASE_REQUEST@1`
- `PURCHASE_REQUEST_VALIDATE@1`
- `PURCHASE_APPROVAL_ROUTE@1`
- `BUDGET_CHECK@1`
- `SUPPLIER_SELECT@1`
- `PO_GENERATE@1`
- `PO_APPROVE@1`
- `PO_SEND@1`
- `PO_STATUS_TRACK@1`
- `GOODS_RECEIPT_CAPTURE@1`
- `THREE_WAY_MATCH@1`
- `SUPPLIER_RISK_ALERT@1`

## Mined evidence

- PO request -> tiered approver -> budget warning -> audit/logging: https://n8n.io/workflows/16404-route-purchase-order-approvals-and-budget-alerts-with-gmail-slack-and-sheets/
- PO generation + supplier selection + approval threshold + archival: https://n8n.io/workflows/10680-intelligent-purchase-order-generator-with-ai-supplier-selection/
- Supplier-risk daily monitoring pattern: https://n8n.io/workflows/18446-monitor-supplier-risk-daily-with-groq-google-sheets-slack-and-gmail/

---

# 8. Inventory, Orders and Ecommerce Operations

## Reusable pieces

- `ORDER_INGEST@1`
- `ORDER_NORMALIZE@1`
- `ORDER_CUSTOMER_UPSERT@1`
- `INVENTORY_CHECK@1`
- `INVENTORY_RESERVE@1`
- `INVENTORY_SYNC@1`
- `LOW_STOCK_ALERT@1`
- `REORDER_RECOMMEND@1`
- `FULFILLMENT_ROUTE@1`
- `ORDER_STATUS_NOTIFY@1`
- `SHIPPING_TRACK_SYNC@1`
- `RETURN_REQUEST@1`
- `REFUND_APPROVAL@1`
- `POST_PURCHASE_FOLLOWUP@1`
- `ABANDONED_CART_FOLLOWUP@1`

## Mined evidence

- Ecommerce order + inventory + feedback orchestration: https://n8n.io/workflows/6362-automate-e-commerce-orders-inventory-and-feedback-with-slack-sheets-and-gmail/
- WooCommerce order capture + inventory validation/sync: https://n8n.io/workflows/11968-sync-woocommerce-orders-and-inventory-with-google-sheets-and-slack/
- WooCommerce sales-per-SKU + low-stock/reorder alert: https://n8n.io/workflows/12874-track-woocommerce-inventory-and-send-reorder-alerts-via-gmail-and-slack/
- ERPNext covers accounting, order management, inventory, replenishment, sales orders, suppliers, shipments and fulfillment: https://github.com/frappe/erpnext/blob/develop/README.md

---

# 9. Customer Support, Ticketing and SLA

## Reusable pieces

- `SUPPORT_INTAKE@1`
- `SUPPORT_NORMALIZE@1`
- `TICKET_DEDUPE@1`
- `TICKET_CLASSIFY@1`
- `TICKET_PRIORITY@1`
- `TICKET_CREATE@1`
- `TICKET_ROUTE@1`
- `SLA_WATCHDOG@1`
- `KB_RETRIEVE@1`
- `SUPPORT_DRAFT_REPLY@1`
- `SUPPORT_HUMAN_APPROVAL@1`
- `SUPPORT_ESCALATE@1`
- `TICKET_CLOSE_SYNC@1`
- `POST_TICKET_SURVEY@1`

## Mined evidence

- Gmail/forms -> normalized schema -> AI triage -> Slack/Sheets/reply: https://n8n.io/workflows/15835-triage-customer-support-tickets-from-gmail-and-forms-with-openai-slack-and-sheets/
- Support triage + CRM + DLQ + SLA thresholds: https://n8n.io/workflows/10184-automate-customer-support-with-gpt-4o-slack-and-crm-integration/
- Gmail/Slack -> Zendesk + tracking: https://n8n.io/workflows/8750-create-zendesk-tickets-from-gmail-and-slack-with-google-sheets-tracking/
- Human-approved multilingual reply: https://n8n.io/workflows/10907-multilingual-email-auto-replies-with-deepl-gpt-4o-and-slack-human-approval/
- Chatwoot core outside `enterprise/` is MIT; useful as self-hosted support/WhatsApp integration target, not necessarily code to embed: https://github.com/chatwoot/chatwoot/blob/develop/LICENSE

---

# 10. Client/Customer Onboarding and Service Delivery

## Reusable pieces

- `CLIENT_WON_TRIGGER@1`
- `CLIENT_RECORD_CREATE@1`
- `CLIENT_FOLDER_CREATE@1`
- `CLIENT_PROJECT_CREATE@1`
- `CLIENT_TASK_CHECKLIST@1`
- `CLIENT_CONTRACT_START@1`
- `CLIENT_INITIAL_INVOICE@1`
- `CLIENT_ACCESS_REQUESTS@1`
- `CLIENT_WELCOME_MESSAGE@1`
- `KICKOFF_SCHEDULE@1`
- `ONBOARDING_STAGE_WATCHDOG@1`
- `CLIENT_HANDOFF_COMPLETE@1`

## Mined evidence

- Form -> Asana project -> contract -> email -> Sheets -> Slack channel: https://n8n.io/workflows/12479-create-client-onboarding-projects-contracts-and-slack-channels-from-form-data/
- Staged day 0/1/3/7 onboarding with compliance guardrail subworkflow: https://n8n.io/workflows/18686-send-staged-client-onboarding-emails-with-clio-and-smtp/
- Zapier business-owner automation explicitly includes welcome emails, kickoff tasks and access requests when a deal closes: https://zapier.com/automations/business-owners

---

# 11. HR Administration, Onboarding, Leave and Offboarding

## Reusable pieces

- `CANDIDATE_INTAKE_ADMIN@1` — administrative capture only; hiring decisions remain human-controlled.
- `CV_EXTRACT@1`
- `INTERVIEW_SCHEDULE@1`
- `NEW_HIRE_VALIDATE@1`
- `USER_ACCOUNT_PROVISION@1`
- `EMPLOYEE_ONBOARDING_CHECKLIST@1`
- `POLICY_ACKNOWLEDGEMENT@1`
- `TRAINING_REMINDER@1`
- `LEAVE_REQUEST@1`
- `LEAVE_APPROVAL@1`
- `OFFBOARDING_TRIGGER@1`
- `ACCESS_REVOKE@1`
- `OFFBOARDING_AUDIT@1`
- `EMPLOYEE_DOC_EXPIRY_ALERT@1`

## Mined evidence

- New hire provisioning Google Workspace + tasks + Slack/Gmail + log: https://n8n.io/workflows/16268-provision-new-hire-it-accounts-with-google-workspace-slack-and-gmail/
- Day 0-30 onboarding: https://n8n.io/workflows/14142-onboard-employees-automatically-with-google-workspace-slack-notion-and-gmail/
- Offboarding access revocation + audit: https://n8n.io/workflows/16403-manage-employee-offboarding-with-google-workspace-slack-hubspot-and-notion/
- Microsoft identifies onboarding, expense approval and document approvals as common human/integration/document BPM patterns: https://www.microsoft.com/en-us/power-platform/products/power-automate/topics/business-process/business-process-management-bpm

---

# 12. Smart Inbox, Email and Messaging Operations

## Reusable pieces

- `MESSAGE_INTAKE@1`
- `EMAIL_CLASSIFY_ROUTE@1`
- `EMAIL_ATTACHMENT_EXTRACT@1`
- `EMAIL_TO_TASK@1`
- `EMAIL_TO_CRM@1`
- `EMAIL_DRAFT_REPLY@1`
- `EMAIL_APPROVAL_SEND@1`
- `UNANSWERED_MESSAGE_WATCHDOG@1`
- `INBOX_DAILY_DIGEST@1`
- `MESSAGE_THREAD_DEDUPE@1`

## Hardening rules

- Auto-send is policy-controlled; default human approval for financially/legal/sensitive outbound content.
- Preserve provider thread/message IDs.
- Strip quoted history/signatures before AI classification where appropriate, but retain source reference.

---

# 13. Document Lifecycle, Records and Knowledge

## Reusable pieces

- `FILE_INGEST@1`
- `FILE_MIME_VALIDATE@1`
- `DOCUMENT_CLASSIFY@1`
- `OCR_EXTRACT@1`
- `STRUCTURED_FIELD_EXTRACT@1`
- `DOCUMENT_RENAME@1`
- `DOCUMENT_ROUTE_FOLDER@1`
- `DOCUMENT_DEADLINE_EXTRACT@1`
- `DOCUMENT_EXPIRY_ALERT@1`
- `DOCUMENT_INDEX@1`
- `DOCUMENT_ARCHIVE@1`
- `DOCUMENT_TO_RAG@1`
- `RAG_ANSWER_WITH_EVIDENCE@1`

## Mined evidence

- Google Drive PDF extraction -> clean JSON: https://n8n.io/workflows/9061-extract-and-clean-pdf-data-from-google-drive/
- Mistral OCR -> clean Google Docs: https://n8n.io/workflows/6937-turn-any-pdf-into-a-clean-google-doc-with-mistral-ocr/
- OCR/classification -> rename/move/log/deadline/calendar: https://n8n.io/workflows/15866-classify-documents-with-gemini-and-organize-them-in-google-drive/
- Gmail legal PDF archive/index with failure paths: https://n8n.io/workflows/17245-archive-and-index-legal-pdfs-from-gmail-with-gemini-sheets-and-google-drive/
- Drive -> OCR JSON -> chunk/embed/vector -> archive: https://n8n.io/workflows/11653-process-ocr-documents-from-google-drive-into-searchable-knowledge-base-with-openai-and-pinecone/

---

# 14. Feedback, NPS/CSAT, Reviews, Retention and Reactivation

## Reusable pieces

- `FEEDBACK_REQUEST@1`
- `FEEDBACK_CAPTURE@1`
- `NPS_CSAT_SCORE@1`
- `FEEDBACK_CLASSIFY@1`
- `DETRACTOR_ALERT@1`
- `POSITIVE_REVIEW_REQUEST@1`
- `RETENTION_FOLLOWUP@1`
- `RENEWAL_REMINDER@1`
- `REACTIVATION_CAMPAIGN@1`

## Mined evidence

- Closed-ticket feedback request pattern: https://n8n.io/workflows/8752-ai-powered-customer-feedback-collection-with-gpt-4o-google-sheets-and-slack-alerts/
- Formbricks core can run link/web/in-app surveys and integrates with n8n; AGPL core, enterprise/white-label restrictions must be respected: https://github.com/formbricks/formbricks

---

# 15. Management Reporting, KPIs, Alerts and Savings

## Reusable pieces

- `DATA_AGGREGATE@1`
- `KPI_CALCULATE@1`
- `TREND_CALCULATE@1`
- `THRESHOLD_ALERT@1`
- `ANOMALY_REVIEW@1`
- `DAILY_EXECUTIVE_BRIEF@1`
- `WEEKLY_EXECUTIVE_BRIEF@1`
- `FINANCE_HEALTH_REPORT@1`
- `OPS_HEALTH_REPORT@1`
- `SAVINGS_EVENT_EMIT@1`
- `SAVINGS_ROLLUP@1`

## Mined evidence

- Daily CFO invoice-health report with calculated KPIs/trends then AI narrative: https://n8n.io/workflows/18673-send-daily-cfo-invoice-health-reports-with-google-sheets-groq-gmail-and-slack/
- Weekly KPI trend/benchmark brief: https://n8n.io/workflows/19312-send-weekly-kpi-executive-summaries-from-google-sheets-via-gemini-gmail-and-slack/
- ClickUp + Sheets -> KPI summary + error alerts: https://n8n.io/workflows/9464-sync-kpi-metrics-from-clickup-and-google-sheets-to-slack-and-gmail/

## Hardening rules

- KPI calculations are deterministic; AI writes explanation, not authoritative numeric facts.
- Savings Engine must display estimation method/confidence and never claim payroll cash savings merely from time released.

---

# 16. Generic Approvals and Human-in-the-Loop

## Reusable pieces

- `APPROVAL_REQUEST@1`
- `APPROVAL_DECISION@1`
- `APPROVAL_MULTI_LEVEL@1`
- `APPROVAL_TIMEOUT_ESCALATE@1`
- `APPROVAL_AUDIT@1`
- `EXCEPTION_QUEUE@1`
- `HUMAN_REVIEW_TASK@1`

## Mined evidence

Microsoft states approvals are common for leave, document sign-off and expense reports: https://learn.microsoft.com/en-us/power-automate/get-started-approvals

This is a cross-cutting platform primitive, not a domain-specific workflow.

---

# 17. Data Synchronization, Migration and Master Data

## Reusable pieces

- `ENTITY_SYNC_ONE_WAY@1`
- `ENTITY_SYNC_BIDIRECTIONAL@1`
- `FIELD_MAP_TRANSFORM@1`
- `MASTER_DATA_DEDUPE@1`
- `MASTER_DATA_ENRICH@1`
- `SYNC_CONFLICT_QUEUE@1`
- `BACKFILL_IMPORT@1`
- `EXPORT_BATCH@1`
- `DATA_QUALITY_CHECK@1`
- `WEBHOOK_EVENT_INGEST@1`

## Hardening rules

- Define source-of-truth per field/entity.
- Store external IDs and sync cursor/version.
- Conflict resolution is explicit.
- Migrations are separate from continuous sync.

---

# 18. Internal IT and Access Operations

## Reusable pieces

- `ACCESS_REQUEST@1`
- `ACCESS_APPROVAL@1`
- `ACCOUNT_PROVISION@1`
- `ACCOUNT_DEPROVISION@1`
- `CREDENTIAL_EXPIRY_ALERT@1`
- `INTEGRATION_HEALTH_CHECK@1`
- `INCIDENT_INTAKE@1`
- `INCIDENT_ROUTE@1`
- `INCIDENT_NOTIFY@1`

These overlap HR onboarding/offboarding but remain reusable for non-HR access requests.

---

# 19. Project, Work Order and Service Operations

## Reusable pieces

- `WORK_REQUEST_INTAKE@1`
- `WORK_ORDER_CREATE@1`
- `WORK_ASSIGN@1`
- `WORK_STATUS_SYNC@1`
- `WORK_SLA_WATCHDOG@1`
- `WORK_CUSTOMER_NOTIFY@1`
- `WORK_COMPLETE@1`
- `SERVICE_MAINTENANCE_REMINDER@1`
- `TIMESHEET_AGGREGATE@1`
- `PROJECT_STATUS_BRIEF@1`

Useful for workshops, maintenance businesses, consultancies, agencies and field-service SMEs.

---

# 20. Marketing/Admin Automation (common but lower initial risk priority)

## Reusable pieces

- `CAMPAIGN_LEAD_CAPTURE@1`
- `AUDIENCE_SYNC@1`
- `CONTENT_APPROVAL@1`
- `CONTENT_SCHEDULE@1`
- `CAMPAIGN_REPORT@1`
- `EVENT_REGISTRATION@1`
- `EVENT_REMINDER@1`
- `WEB_FORM_TO_RECORD@1`

These are lower priority than revenue/ops/finance capabilities but remain quarry targets.

---

# Cross-domain solution recipes

## Service company

```text
LEAD_CAPTURE
-> LEAD_DEDUPE
-> LEAD_SCORE
-> CRM_UPSERT_CONTACT
-> LEAD_ACKNOWLEDGE
-> APPOINTMENT_REQUEST
-> AVAILABILITY_CHECK
-> APPOINTMENT_CREATE
-> QUOTE_GENERATE_DOC
-> QUOTE_DELIVER
-> QUOTE_FOLLOWUP
-> CONTRACT_GENERATE_FROM_TEMPLATE
-> INVOICE_CREATE_FROM_WIN
-> PAYMENT_REMINDER
-> CLIENT_PROJECT_CREATE
-> POST_TICKET_SURVEY
```

## Retail/ecommerce SME

```text
ORDER_INGEST
-> INVENTORY_CHECK
-> INVENTORY_RESERVE
-> FULFILLMENT_ROUTE
-> ORDER_STATUS_NOTIFY
-> INVENTORY_SYNC
-> LOW_STOCK_ALERT
-> PURCHASE_REQUEST
-> PO_APPROVE
-> PO_SEND
-> INVOICE_OCR_EXTRACT
-> ACCOUNTING_EXPORT
-> POST_PURCHASE_FOLLOWUP
```

## Professional office / accounting-heavy SME

```text
EMAIL_ATTACHMENT_EXTRACT
-> DOCUMENT_CLASSIFY
-> INVOICE_OCR_EXTRACT
-> DOCUMENT_DUPLICATE_DETECT
-> DOCUMENT_ARITHMETIC_VALIDATE
-> DOCUMENT_EXCEPTION_REVIEW
-> ACCOUNTING_EXPORT
-> DOCUMENT_ARCHIVE
-> AR_AGING_CALCULATE
-> PAYMENT_REMINDER
-> FINANCE_HEALTH_REPORT
```

## Customer-service-heavy SME

```text
SUPPORT_INTAKE
-> TICKET_DEDUPE
-> TICKET_CLASSIFY
-> TICKET_PRIORITY
-> TICKET_CREATE
-> TICKET_ROUTE
-> KB_RETRIEVE
-> SUPPORT_DRAFT_REPLY
-> SUPPORT_HUMAN_APPROVAL
-> SLA_WATCHDOG
-> POST_TICKET_SURVEY
```

---

# Coverage principle

The quarry keeps mining even after these capabilities exist. A new external workflow can:

1. introduce a missing capability;
2. improve an existing capability;
3. reveal a missing failure mode/test fixture;
4. reveal a better connector adapter;
5. become a `no-pass-verified` evidence record;
6. supersede an older baseline after full re-certification.

`APPROVED_BASELINE` is never the end of mining; it is only the current trusted implementation.
