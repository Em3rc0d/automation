# Connector Matrix — Provider Adapters for Reusable Automations

Status: MINING / DESIGN AUTHORITY
Updated: 2026-09-11

The capability library should depend on **capabilities**, not hard-coded vendors.

Example:

```text
SEND_MESSAGE
  -> WhatsApp Cloud adapter
  -> Twilio adapter
  -> Gmail adapter
  -> Outlook adapter
```

A baseline may require `messaging.send` or `crm.contact.upsert`; the client installation chooses the adapter.

## Adapter contract minimum

Each connector adapter should document:

- provider and API version;
- auth mode (OAuth2, API key, service account, webhook secret, etc.);
- required scopes;
- tenant-scoped `ConnectorAccount` mapping;
- supported actions/triggers;
- rate limits/quotas if known;
- external IDs that must be persisted;
- idempotency support/provider keys;
- webhook signature/replay semantics;
- retryable vs non-retryable errors;
- credential refresh/expiry behavior;
- healthcheck;
- PII/data residency considerations;
- provider-specific costs passed to Savings/Cost telemetry;
- test sandbox/mock strategy;
- licensing/terms notes if code or self-hosted software is reused.

---

# Messaging and Email

## Capabilities

- `messaging.receive`
- `messaging.send`
- `messaging.thread.read`
- `messaging.media.download`
- `email.receive`
- `email.send`
- `email.draft`
- `email.thread.read`
- `email.label`

## Provider targets

- Meta WhatsApp Cloud API
- Twilio WhatsApp/SMS
- Gmail / Google Workspace
- Microsoft Outlook / Graph
- SMTP / IMAP
- Slack
- Telegram

## Notes

Preserve provider message/thread IDs and delivery state. Outbound side effects require idempotency and policy/approval gates where appropriate.

---

# CRM

## Capabilities

- `crm.contact.search`
- `crm.contact.upsert`
- `crm.company.search`
- `crm.company.upsert`
- `crm.opportunity.create`
- `crm.opportunity.update`
- `crm.activity.log`
- `crm.task.create`

## Provider targets

- HubSpot
- Pipedrive
- Salesforce
- HighLevel
- Twenty CRM
- Frappe CRM
- Airtable/Notion/Sheets as lightweight fallback records

## OSS mining notes

### Twenty

- Current repo: https://github.com/twentyhq/twenty
- Workflow concepts include record triggers, schedule, webhook, HTTP, code, branches, iterator, AI agent, delay and forms: https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/getting-started/core-concepts/workflows.mdx
- Main product has AGPL/commercial split; individual `twenty-client-sdk` package is MIT.
- Treat as integration target/reference unless legal review supports deeper reuse.

### Frappe CRM / ERPNext

- Frappe CRM includes Twilio, Exotel, WhatsApp and ERPNext integrations: https://github.com/frappe/crm/blob/develop/README.md
- ERPNext includes accounting, inventory/order management, CRM, sales, purchase and other modules: https://github.com/frappe/erpnext/blob/develop/README.md
- ERPNext is GPLv3. Prefer API integration/reference patterns rather than embedding code into our proprietary control plane.

---

# Scheduling

## Capabilities

- `calendar.availability.read`
- `calendar.event.create`
- `calendar.event.update`
- `calendar.event.cancel`
- `booking.create`
- `booking.reschedule`
- `booking.cancel`
- `booking.webhook`

## Provider targets

- Google Calendar
- Microsoft Calendar
- Cal.com
- Calendly/Acuity as external adapters when client already uses them

## OSS mining notes

Cal.com core is AGPL/open-core with enterprise/commercial portions. API workflows include slot query, booking, cancel/reschedule and webhooks. Use as integration target unless licensing is separately approved for reuse.

Reference: https://github.com/calcom/cal.diy/blob/main/agents/skills/calcom-api/SKILL.md

---

# Accounting, Invoicing and ERP

## Capabilities

- `accounting.customer.upsert`
- `accounting.invoice.create`
- `accounting.invoice.get`
- `accounting.invoice.mark_paid`
- `accounting.expense.create`
- `accounting.bill.create`
- `accounting.payment.read`
- `accounting.vendor.search`
- `accounting.journal.create` (high-risk; explicit approval/policy)

## Provider targets

- QuickBooks
- Xero
- Odoo
- ERPNext
- Wave
- FreshBooks
- Invoice Ninja (integration/reference with license caveat)
- Google Sheets as small-PyME transitional ledger, never marketed as accounting authority by default

## OSS mining notes

### ERPNext

ERPNext's accounts module includes journal entries, sales invoices, purchase invoices, general ledger and payment ledger concepts. Reference: https://github.com/frappe/erpnext/blob/develop/erpnext/accounts/README.md

### Invoice Ninja

- API docs: https://github.com/invoiceninja/api-docs
- Main self-hosted source has source-available/white-label/commercial conditions. Do not treat it as a permissive code baseline without legal review.

---

# Documents, OCR and Storage

## Capabilities

- `storage.file.put`
- `storage.file.get`
- `storage.file.move`
- `storage.file.hash`
- `document.ocr`
- `document.parse`
- `document.classify`
- `document.extract_structured`
- `document.render_pdf`

## Provider/engine targets

- Google Drive
- Dropbox
- S3-compatible storage
- Supabase Storage
- Docling
- docTR
- invoice2data
- Mistral OCR
- Google Vision / Document AI
- Mindee
- OpenAI/Gemini multimodal extraction

## Strategy

```text
known supplier/template
  -> deterministic parser/OCR
  -> validate
  -> success

unknown/ambiguous
  -> VLM/LLM extraction
  -> deterministic arithmetic/schema validation
  -> confidence gate
  -> human review if needed
```

AI confidence alone is not accounting authority.

---

# Ecommerce and Orders

## Capabilities

- `commerce.order.receive`
- `commerce.order.get`
- `commerce.order.update`
- `commerce.product.get`
- `commerce.stock.get`
- `commerce.stock.update`
- `commerce.fulfillment.update`
- `commerce.refund.request`

## Provider targets

- Shopify
- WooCommerce
- custom storefront webhook/API
- ERPNext/Odoo as operational backend

Persist provider order ID, line-item IDs, SKU and fulfillment identifiers.

---

# Customer Support

## Capabilities

- `support.ticket.create`
- `support.ticket.update`
- `support.ticket.search`
- `support.ticket.comment`
- `support.ticket.assign`
- `support.ticket.close`
- `support.conversation.receive`

## Provider targets

- Zendesk
- Freshdesk
- Chatwoot
- HubSpot Service
- Notion/Trello/Sheets lightweight fallback

## OSS mining notes — Chatwoot

Chatwoot core outside the `enterprise/` directory is MIT according to its repository license. Its official docs are specifically for APIs/custom flows. It is a strong self-hosted integration target for omnichannel support/WhatsApp.

- License: https://github.com/chatwoot/chatwoot/blob/develop/LICENSE
- Docs repo: https://github.com/chatwoot/docs

Do not assume enterprise modules inherit MIT.

---

# Surveys, Feedback and NPS

## Capabilities

- `survey.send`
- `survey.response.receive`
- `survey.response.read`
- `survey.score.calculate`

## Provider targets

- Formbricks
- Typeform
- Google Forms
- custom web forms

## OSS mining notes — Formbricks

Core is AGPLv3, enterprise modules separate. Repository states commercial use of core is possible under AGPL obligations but also explicitly states white-label/resale restrictions. Therefore: useful integration/reference target; do not embed/white-label into our portal without a deliberate license decision.

Reference: https://github.com/formbricks/formbricks

---

# Project, Work and Ticket Management

## Capabilities

- `task.create`
- `task.update`
- `task.assign`
- `task.search`
- `project.create`
- `project.update`

## Provider targets

- Asana
- ClickUp
- Jira
- Trello
- Notion
- Linear for technical teams
- client ERP/project system through HTTP adapter

---

# Payments

## Capabilities

- `payment.link.create`
- `payment.status.read`
- `payment.webhook.receive`
- `payment.refund.request`

## Provider targets

- Stripe
- PayPal
- provider chosen by client/region

Payment and refund operations require stronger approval/idempotency rules than read-only syncs.

---

# Identity / Workspace / HR Administration

## Capabilities

- `identity.user.create`
- `identity.user.disable`
- `identity.group.add`
- `identity.group.remove`
- `workspace.folder.create`
- `workspace.permission.grant`
- `workspace.permission.revoke`

## Provider targets

- Google Workspace Admin
- Microsoft Entra/M365
- Slack
- Notion
- HR/ERP adapters

Provisioning/revocation should always produce `AuditEvent` and explicit result per target system.

---

# Automation Engines and Connector Framework Quarry

## n8n

Initial orchestration engine per ADR. Baseline workflows live under `workflows/n8n/` only after quarry promotion.

## Activepieces

- Repository: https://github.com/activepieces/activepieces
- Community code outside EE/commercial directories is MIT according to current license.
- Hundreds of TypeScript pieces are useful as connector implementation/reference quarry independent of our engine choice.
- Never assume third-party incorporated components share the same license; verify each reused portion.

## Direct workers

For critical/reusable capabilities where n8n nodes become awkward, provider adapters may be implemented as our own TypeScript/Python workers behind stable capability contracts.

---

# Integration Target vs Code Baseline

Every external OSS project must be classified separately:

```text
INTEGRATION_TARGET
REFERENCE_ARCHITECTURE
CONNECTOR_CODE_CANDIDATE
EMBEDDABLE_DEPENDENCY
NO_PASS_LICENSE
```

A useful product does not automatically mean its code is safe to incorporate.

Examples from current mining:

- Activepieces core pieces: potentially permissive code quarry with per-path/third-party verification.
- Chatwoot core: permissive integration/reference candidate outside enterprise tree.
- Twenty: strong integration/reference target; AGPL/commercial split means careful reuse.
- Formbricks: integration target; AGPL + explicit white-label restrictions.
- Cal.com: integration target; AGPL/open-core/commercial API distinctions.
- ERPNext: integration target/reference; GPLv3.
- Invoice Ninja: API/integration target; source-available/commercial reuse caveats.
