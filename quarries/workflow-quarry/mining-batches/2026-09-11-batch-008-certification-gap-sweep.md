# Mining Batch 008 — Common SMB Certification Gap Sweep

Date: 2026-09-11
Purpose: close evidence gaps across common SMB automation families before MK0 repository certification.

## Cross-functional automation

- Zapier operations automation (2026): https://zapier.com/blog/operations-automation/
  - Treats operations automation as end-to-end process automation across IT, sales, marketing, HR and support, not only one-step task automation.
  - Reinforces our capability-composition model and need for visibility/error handling.
- Zapier business automation (2026): https://zapier.com/blog/business-automation/
  - Covers finance, HR, operations, marketing, sales and support.
- Microsoft Power Automate approvals: https://learn.microsoft.com/en-us/power-automate/get-started-approvals
  - Approval primitive applies to vacation, document sign-off and expenses.
- Modern Power Automate approvals: https://learn.microsoft.com/en-us/power-automate/modern-approvals
  - Explicit examples include invoices, work orders, sales quotations, vacation, overtime and travel.

## Client onboarding / contract lifecycle

- n8n onboarding saga: https://n8n.io/workflows/18626-coordinate-client-onboarding-sagas-via-webhook-data-tables-and-gmail/
  - Token validation, normalized intake, durable step state, duplicate claim protection, stranded-onboarding alerting.
  - Mine for `CLIENT_ONBOARDING_ORCHESTRATE`, state machine, timeout/watchdog.
- Signed contract -> onboarding: https://n8n.io/workflows/18592-track-contract-signatures-and-onboard-clients-with-airtable-groq-gmail-trello-and-slack/
  - Verified webhook secret, contract status tracking, onboarding checklist, stale-deal watchdog.
- DocuSign -> client/payment/onboarding: https://n8n.io/workflows/16754-process-signed-docusign-contracts-with-supabase-claude-stripe-outlook-and-gmail/
  - Useful contract-completed transition pattern and provider-ID reconciliation.
- Full agreement lifecycle: https://n8n.io/workflows/9925-automate-full-agreement-lifecycle-with-jotform-approvals-signwell-e-signatures-and-tracking/
  - Form -> draft -> approval -> e-sign -> delivery -> audit.

## Quotes / proposals

- Fixed-price quotes with replay protection: https://n8n.io/workflows/18873-send-fixed-price-client-quotes-with-approvals-using-gmail-and-data-tables/
  - Strong patterns: authenticated intake, integer currency amounts, versioned price book, request fingerprint, replay/conflict handling before send.
- Proposal generation + e-sign: https://n8n.io/workflows/12959-generate-proposals-with-gpt-4o-google-docs-gmail-and-slack/
  - Mine document generation/delivery/tracking, not autonomous pricing semantics.
- Discovery transcript -> proposal: https://n8n.io/workflows/12285-generate-client-quotes-from-call-transcripts-with-claudegpt-google-drive-and-pandadoc/
  - Candidate for optional AI-assisted SOW extraction with human approval.

## HR / IT lifecycle

- Leave approvals: https://n8n.io/workflows/12070-automate-employee-leave-approvals-with-gpt-gmail-and-calendar-integration/
  - Form -> normalized summary -> approval -> response/calendar; AI is presentation assistance, approval remains human.
- Offboarding: https://n8n.io/workflows/16403-manage-employee-offboarding-with-google-workspace-slack-hubspot-and-notion/
  - Validates employee input, derives offboarding ID/risk/deadline, revokes Google/Slack access and logs evidence.
- Employee onboarding/provisioning: https://n8n.io/workflows/13145-automate-employee-onboarding-and-google-workspace-account-creation-with-gmail-google-sheets-pdfbro-and-google-gemini/
  - Mine offer/onboarding/account-provisioning states; credentials delivery must be redesigned under our secret policy.
- Zapier HR automation 2026: https://zapier.com/blog/human-resources-automation/
- Zapier employee onboarding/offboarding 2026: https://zapier.com/blog/automate-employee-onboarding-offboarding/

## Support / SLA

- Rule-based SLA queues: https://n8n.io/workflows/16329-triage-support-tickets-into-sla-queues-via-webhook-gmail-and-google-sheets/
  - Useful deterministic baseline without mandatory AI.
- Strong support triage: https://n8n.io/workflows/19097-triage-support-tickets-with-openai-hubspot-slack-linear-and-google-sheets/
  - Input validation, dedupe, CRM enrichment, classification, escalation and draft reply with audit log.
  - Mine dedupe/SLA/escalation; human-reviewed replies preferred initially.

## Inventory / procurement / work orders

- Inventory -> PO: https://n8n.io/workflows/11679-automate-inventory-management-with-google-sheets-and-gmail/
  - Threshold monitoring, reorder quantity, supplier communication and audit.
- Inventory + AI forecast + ERP: https://n8n.io/workflows/10535-automate-inventory-replenishment-and-purchase-orders-with-mistral-ai-and-erp/
  - Forecasting is optional/advanced; deterministic stock/reorder rule remains baseline.
- Stockout forecast + draft POs: https://n8n.io/workflows/18067-forecast-stockouts-and-draft-purchase-orders-with-gemini-sheets-slack-and-gmail/
  - Calculates velocity, days of cover, reorder point and suggested quantity before AI explanation.
- PO approval/budget alerts: https://n8n.io/workflows/16404-route-purchase-order-approvals-and-budget-alerts-with-gmail-slack-and-sheets/
  - Validated request, approval tiers, budget lookup, alerts and tracking.
- Invoice + stock -> purchase requisition/work order: https://n8n.io/workflows/11678-automate-invoice-processing-and-stock-management-with-ai-gmail-sheets-and-slack/
  - Cross-domain pattern connecting document extraction, inventory decision and procurement/work order.

## Ecommerce / retention

- Ecommerce orders/inventory/feedback: https://n8n.io/workflows/6362-automate-e-commerce-orders-inventory-and-feedback-with-slack-sheets-and-gmail/
  - Order lifecycle, stock checks, fulfillment notifications and delayed feedback request.
- Shopify multi-module automation: https://n8n.io/workflows/4455-shopify-multi-module-automation-with-gpt-4o-langchain-agents-and-integrations/
  - Mine individual modules only: support escalation, abandoned-cart recovery, inventory alerting, review request/monitoring. Do not promote one giant agentic workflow as baseline.

## Reporting / management

- Executive decision brief: https://n8n.io/workflows/17038-generate-executive-decision-briefings-from-apis-with-openai-and-google-sheets/
  - Parallel data collection, normalized snapshot, missing-source tolerance, anomaly findings and delivery.
  - Baseline should separate deterministic metric snapshot from optional AI narrative.

## Certification conclusions

1. Common SMB process families in `workflows/SMB-CAPABILITY-LIBRARY.md` now have at least conceptual or concrete external evidence.
2. Best reusable patterns repeatedly observed: validation before state access, deterministic IDs/fingerprints, dedupe before create/send, human approval for consequential actions, explicit SLA/watchdogs, provider-ID persistence and complete audit trails.
3. AI is not a mandatory primitive. Prefer deterministic rules for arithmetic, identity, pricing, dedupe, thresholds, permissions and side-effect gating; use AI for extraction/classification/drafting where it adds measurable value.
4. Large monolithic workflows are evidence sources, not preferred baselines. Promote small capability blocks with stable contracts.
5. Vertical/regulatory systems (full payroll, tax filing, healthcare records, banking core, manufacturing MRP) remain integration domains, not scope for our generic control plane.
