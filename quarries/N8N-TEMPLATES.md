# Quarry — n8n Templates and Reusable Workflow Patterns

Purpose: accelerate delivery by starting from public templates/patterns instead of designing every workflow from scratch.

**Important:** a public n8n workflow is not automatically safe or license-compatible for production. Import into a sandbox, inspect every node, remove embedded secrets, check external API terms, add idempotency, telemetry, retries and tenant boundaries, then promote.

## High-value public templates already identified

### 1. Gmail invoices → OpenAI → Sheets → reminders

URL:
https://n8n.io/workflows/19319-process-gmail-invoices-with-openai-google-sheets-and-slack-reminders/

Pattern:

```text
Gmail
→ identify invoice message/attachment
→ structured extraction with OpenAI
→ deduplicate/check state in Sheets
→ persist status
→ reminder/notification path
```

Useful for:
- OpsFlow
- invoice intake
- accounts payable intake
- missing-data reminders

Credentials/dependencies:
- Gmail
- OpenAI
- Google Sheets
- Slack in the original pattern

Adaptation:
- replace Sheets as source of truth with `ProcessRecord` + Postgres;
- keep Gmail as source reference, not duplicate whole mailbox;
- enforce schema validation;
- add duplicate key `(tenant, source_system, source_id)`;
- emit execution telemetry;
- separate extraction confidence from business approval.

### 2. Email invoice → OCR/GPT → QuickBooks → Sheets

URL:
https://n8n.io/workflows/14272-process-email-invoices-with-ocr-gpt-4-slack-quickbooks-and-google-sheets/

Pattern:

```text
email attachment
→ OCR
→ AI extraction
→ validation/review
→ accounting system
→ tracking sheet
→ notification
```

Useful for:
- invoice processor
- accounts payable
- document AI

Adaptation risks:
- OCR confidence;
- duplicate invoice detection;
- tax/accounting rules;
- never auto-post financially material records without customer-approved rules;
- human approval for ambiguous/high-risk values.

### 3. Drive → Supabase → OpenAI RAG

URL:
https://n8n.io/workflows/4551-ai-powered-rag-document-processing-and-chatbot-with-google-drive-supabase-openai/

Pattern:

```text
Drive file
→ parse/chunk
→ embeddings
→ Supabase vector storage
→ retrieval
→ response
```

Useful for:
- future document knowledge assistants
- policy/document search
- internal support

Not MK1 unless a client pays for RAG.

### 4. MCP + Supabase multi-tenant CRUD/RAG

URL:
https://n8n.io/workflows/3675-mcp-supabase-server-for-ai-agent-with-rag-and-multi-tenant-crud/

Use as pattern source only.

Important finding: **do not copy its tenancy strategy blindly.** Our tenancy is explicit `tenant_id` + RLS, not dynamic tables per customer.

### 5. Documentation expert — Gemini + Supabase

URL:
https://n8n.io/workflows/5993-create-a-documentation-expert-bot-with-rag-gemini-and-supabase/

Use:
- knowledge-bot pattern;
- ingestion/retrieval ideas;
- later phase.

### 6. Supabase/OpenAI/Cohere RAG

URL:
https://n8n.io/workflows/6345-answer-questions-from-documents-with-rag-using-supabase-openai-and-cohere-reranker/

Use:
- retrieval + reranking architecture reference.

### 7. WhatsApp + Supabase RAG

URL:
https://n8n.io/workflows/6771-whatsapp-rag-chatbot-with-supabase-gemini-25-flash-and-openai-embeddings/

Use:
- WhatsApp message → retrieval → response pattern.

Constraint:
- production channel should default to official WhatsApp Business Platform.

## Template families we need to continuously mine

### LeadFlow
Search for:
- form/webhook → CRM
- Gmail → lead
- WhatsApp → CRM
- Meta lead ads → CRM
- lead assignment
- lead scoring
- delayed follow-up
- no-response sequences
- stale lead alert

Target canonical shape:

```text
Trigger
→ normalize
→ dedupe
→ ProcessRecord(lead)
→ business rules
→ CRM/upsert
→ first response
→ delayed follow-up
→ result/status
→ telemetry
```

### Quote2Cash
Search for:
- quote generation
- PDF generation
- approval
- invoice creation
- due-date reminder
- payment confirmation
- overdue escalation

Target shape:

```text
request
→ price/rules
→ quote
→ approval if needed
→ send
→ follow-up timer
→ accepted
→ invoice
→ payment state
→ reminders/escalation
→ telemetry/savings
```

### OpsFlow
Search for:
- Gmail classifier
- attachment extraction
- email → task
- email → CRM
- document routing
- Drive organization
- executive digest

Target shape:

```text
email/document
→ normalize
→ classify
→ extract structured data
→ validation
→ ProcessRecord
→ action/task/storage
→ telemetry
```

### Appointments
Search for:
- Google Calendar booking
- reminder 24h/2h
- confirmation
- cancellation
- reschedule
- waitlist
- post-appointment review

### Customer support
Search for:
- email/WhatsApp → ticket
- triage
- SLA
- escalation
- FAQ
- sentiment/priority
- human handoff

### Client onboarding
Search for:
- closed deal → Drive folder
- create project
- checklist
- welcome mail
- contract/document generation
- kickoff calendar

### Executive reporting
Search for:
- scheduled CRM aggregation
- Sheets/DB → summary
- anomalies
- digest email/Slack/WhatsApp

## Mandatory hardening before reuse

Every imported baseline must answer:

```text
[ ] source URL recorded
[ ] template license/terms checked
[ ] credentials removed from export
[ ] tenant binding explicit
[ ] input schema validated
[ ] idempotency key defined
[ ] duplicate side effects prevented
[ ] retries bounded
[ ] provider rate limits considered
[ ] error path emits Incident
[ ] success/failure emits ExecutionEvent
[ ] business data emitted as ProcessRecord
[ ] SavingsEvent metrics defined when applicable
[ ] sensitive data redacted from logs
[ ] human approval added for risky side effects
[ ] production rollback documented
```

## Internal reusable n8n subflows to build once

1. `AOP_EXECUTION_STARTED`
2. `AOP_EXECUTION_COMPLETED`
3. `AOP_EXECUTION_FAILED`
4. `AOP_PROCESS_RECORD_UPSERT`
5. `AOP_INCIDENT_CREATE`
6. `AOP_APPROVAL_REQUEST`
7. `AOP_IDEMPOTENCY_GUARD`
8. `AOP_CONNECTOR_HEALTHCHECK`

These reduce per-client workflow work and keep telemetry consistent.

## Import/export operational baseline

Documented n8n CLI pattern:

```bash
n8n import:workflow --input=./workflows/n8n/templates/lead-intake.json
```

or multiple separate files:

```bash
n8n import:workflow \
  --separate \
  --input=./workflows/n8n/templates/
```

Production policy: pin n8n version; never depend on `latest`.
