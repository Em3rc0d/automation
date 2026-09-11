# Mining Batch 005 — WhatsApp + Documents + Accounting

Date: 2026-09-11
Status: ACTIVE MINING

## Objective

Expand the quarry specifically around the high-value PyME pattern:

```text
WhatsApp / Email / Webhook
        -> media/document intake
        -> OCR / document parsing
        -> structured extraction
        -> validation / deduplication
        -> human review when confidence is low
        -> accounting/ledger export
        -> archive
        -> confirmation / alert
```

This batch does **not** promote anything to `APPROVED_BASELINE`. It records code, templates, architecture patterns, licensing/provenance and hardening requirements.

---

## A. n8n official/community workflow templates discovered

### A1. WhatsApp receipt OCR + AI extraction
Source: https://n8n.io/workflows/11332-whatsapp-receipt-ocr-and-ai-data-extraction-with-twilio-llamaparse-and-gemini/

Observed pattern:
- Twilio WhatsApp inbound;
- receipt photo/PDF intake;
- LlamaParse OCR/parser;
- AI extraction with Claude/Gemini;
- strict JSON parsing;
- normalization;
- Google Sheets persistence;
- reply/feedback path.

Value: **P0** for `WHATSAPP_INBOUND`, `MEDIA_DOWNLOAD`, `RECEIPT_OCR_EXTRACT`, `DOCUMENT_VALIDATE`, `ACCOUNTING_EXPORT` synthesis.

Hardening required:
- provider-neutral WhatsApp adapter;
- webhook authenticity verification;
- tenant-aware media storage;
- idempotency/correlation key;
- deterministic arithmetic checks;
- confidence policy owned by platform;
- no provider credentials inside workflow JSON;
- ProcessRecord / ExecutionEvent / SavingsEvent emission.

### A2. WhatsApp Cloud API invoice processor
Source: https://n8n.io/workflows/10462-automate-whatsapp-invoice-processing-with-ocr-gpt-4-mini-and-google-services/

Observed pattern:
- WhatsApp Cloud API trigger;
- download media;
- OCR.Space extraction;
- OpenAI summarization/extraction;
- Google Sheets logging;
- Google Drive archival;
- automatic WhatsApp response.

Value: **P0**. Very close to a Pepito-SAC-style use case.

Hardening required:
- separate OCR from semantic extraction;
- replace summary-only semantics with strict schema;
- duplicate detection;
- confidence/review routing;
- tenant storage path;
- accounting-normalization contract;
- regional tax/comprobante validation as separate optional module.

### A3. Gmail invoice validation with OpenAI
Sources:
- https://n8n.io/workflows/16643-extract-and-validate-invoice-pdfs-with-openai-google-sheets-and-gmail/
- https://n8n.io/workflows/18603-extract-and-validate-gmail-invoice-pdfs-into-google-sheets-with-openai/
- https://n8n.io/workflows/18083-extract-invoice-and-receipt-data-from-gmail-pdfs-to-google-sheets-with-openai/
- https://n8n.io/workflows/18836-extract-invoice-data-from-gmail-pdf-invoices-into-a-google-sheets-crm-with-openrouter/

Reusable patterns:
- strict structured output;
- line-item split;
- arithmetic reconciliation;
- VAT/tax validation;
- duplicate invoice lookup;
- Exceptions/Review queue;
- source metadata preservation;
- confidence gating.

These are strong inputs for one canonical `DOCUMENT_VALIDATE` + `INVOICE_NORMALIZE` baseline rather than four client-specific workflows.

### A4. Receipt archival
Source: https://n8n.io/workflows/5451-ai-auto-save-gmail-receipts-to-google-sheets-google-drive/

Reusable pattern:
- scheduled labeled-email ingestion;
- attachment download;
- original file archival;
- structured extraction;
- ledger append;
- processed marker.

### A5. Collections/follow-up
Sources:
- https://n8n.io/workflows/19319-process-gmail-invoices-with-openai-google-sheets-and-slack-reminders/
- https://n8n.io/workflows/19245-follow-up-on-overdue-invoices-with-openai-gmail-and-google-sheets/

Important reusable pattern from overdue workflow:
- deterministic eligibility gates before LLM use;
- recent-conversation detection;
- exact-stage dedupe;
- model returns SEND / DEFER / HUMAN;
- confidence threshold;
- human-review path;
- write-back of decision/next follow-up.

This is a strong reference for `COLLECTION_FOLLOWUP_WATCHDOG`.

---

## B. Importable GitHub workflow — `ivansiyanko/n8n-invoice-ai`

Repository: https://github.com/ivansiyanko/n8n-invoice-ai
License: MIT (verified in repository LICENSE)
Files inspected:
- `README.md`
- `workflow.json`

Observed architecture:

```text
Webhook OR IMAP
 -> Extract File Data
 -> GPT-4o structured extraction
 -> Validate & Enrich
 -> Needs Review?
    -> review: Sheets + Slack + response
    -> accepted: Sheets + accounting action + response
```

Strengths:
- actual importable `workflow.json`;
- PDF/image/scan intent;
- structured field set includes vendor/customer/tax/line items;
- explicit low-confidence review branch;
- optional accounting connector concept;
- permissive MIT license.

Critical findings before hardening:
- no authentication/signature visible on generic webhook;
- base64 passed into model prompt rather than a provider-native image/file contract;
- quality score is primarily field-count based and is insufficient for accounting correctness;
- no arithmetic reconciliation of subtotal/tax/total;
- no duplicate detection/idempotency key;
- QuickBooks action is schematic and provider-specific;
- no tenant/platform contracts;
- no explicit file archival/object-store policy;
- no audit/event telemetry;
- IMAP/webhook merge needs source-normalization contract.

Decision: `LICENSE_CHECKED -> INSPECTED`, P0 hardening candidate. **Not production-ready unchanged.**

---

## C. Deterministic invoice extraction — `invoice-x/invoice2data`

Repository: https://github.com/invoice-x/invoice2data
License: MIT

Why it matters:
- mature deterministic/template extraction for repeated supplier layouts;
- multiple text/OCR backends: pdftotext, pdfminer, pdfplumber, OCRmyPDF, Tesseract, Google Vision;
- YAML/JSON provider templates;
- line-item/table plugins;
- CSV/JSON/XML output;
- Python library mode;
- known usage in Odoo/OCA ecosystem.

Architectural insight:

```text
known supplier/layout
  -> deterministic template extraction first
  -> validate
  -> LLM fallback only when template confidence is insufficient
```

This can reduce cost and hallucination risk for recurring vendors.

Potential platform module:
`DOCUMENT_EXTRACT_DETERMINISTIC@1` or worker-side extraction service.

Do not force every document through an LLM if a deterministic provider template is proven.

---

## D. Reliability/evaluation baseline — `paperflow`

Repository: https://github.com/lordbasilaiassistant-sudo/paperflow
Observed license from public project metadata/README: MIT.

High-value ideas:
- per-field confidence;
- arithmetic verification;
- checking extracted values against source text;
- human review only for uncertain fields/documents;
- real eval harness over 118 generated documents including scans, skewed phone photos, multi-page documents and difficult edge cases.

Decision: P0 **knowledge + test/eval architecture** source.

We should mine its evaluation philosophy even if the implementation is not adopted wholesale.

---

## E. Document conversion / OCR engines

### Docling
Repository/docs: https://github.com/docling-project/docling
License: MIT for codebase; model licenses must be checked individually.

Observed capabilities:
- PDF/image/document conversion;
- unified document representation;
- JSON/Markdown/YAML/etc output;
- OCR modes and multiple OCR engines;
- table/layout support;
- local or server execution.

Potential use:
`DOCUMENT_PREPROCESSOR` / `DOCUMENT_TO_STRUCTURED_TEXT` worker before business extraction.

### docTR
Repository: https://github.com/mindee/doctr
License: Apache-2.0.

Potential use:
local OCR backend when we need control/privacy and do not need a full document-understanding pipeline.

### Receipt OCR local pattern
Repository: https://github.com/jeffersonqiu/llm_ocr
Observed pattern:
- PaddleOCR;
- deterministic/rule-based extraction;
- local Llama via Ollama;
- image preprocessing;
- FastAPI + React.

Useful as a privacy/local-processing baseline; license must be verified before code reuse.

---

## F. Alternative automation engine / connector quarry — Activepieces

Repository: https://github.com/activepieces/activepieces
License structure:
- Community/open portions outside EE directories: MIT Expat;
- enterprise directories: separate commercial license;
- third-party components retain original licenses.

High-value reusable knowledge:
- TypeScript typed `pieces` connector framework;
- 200+ integrations/pieces reported;
- auto retries;
- fully versioned flows;
- human-in-the-loop primitives;
- self-hosting;
- multi-tenant rule visible in repository guidance: Platform -> Projects -> Users and queries scoped by `projectId`/`platformId`;
- side effects separated explicitly from mutations.

Decision: **P0 architectural/connector quarry**, even if n8n remains initial engine.

We should mine connector implementations (Gmail, Sheets, WhatsApp if present, etc.) for API behavior/auth/error semantics rather than reinvent provider clients blindly.

---

## G. Peru / SUNAT knowledge quarry

Source: https://cpe.sunat.gob.pe/tipos_de_comprobantes/boleta

Relevant facts for future Peru-specific accounting automation:
- SUNAT documents electronic boletas/facturas and mechanisms for electronic comprobante consultation/validity checks;
- emitters have retention/availability obligations;
- authenticity/validity verification exists through SUNAT mechanisms.

Decision: create a separate regional quarry before claiming `SUNAT_VALIDATE_CPE` or accounting compliance.

Important boundary:
OCRing a boleta and writing a spreadsheet **is not equivalent** to tax/accounting compliance. Regional validation and accounting semantics must be separate modules with explicit source authority.

---

## H. Video/tutorial evidence

### Receipt OCR with Gemini + n8n
YouTube: https://www.youtube.com/watch?v=6wuw7r5QtNw

Observed teaching pattern:
- receipt upload;
- Gemini document analysis;
- structured fields;
- Google Sheets output;
- model/provider can be swapped;
- HTTP fallback for systems without native nodes.

Value: useful implementation walkthrough; not treated as source-of-truth for production/security.

---

## Synthesis implications

The mining evidence now strongly supports splitting the future Pepito-SAC path into independent reusable capabilities:

```text
WHATSAPP_INBOUND
WHATSAPP_MEDIA_FETCH
DOCUMENT_STORE_ORIGINAL
DOCUMENT_PREPROCESS
DOCUMENT_CLASSIFY
DOCUMENT_EXTRACT_DETERMINISTIC
DOCUMENT_EXTRACT_AI
ACCOUNTING_DOCUMENT_NORMALIZE
DOCUMENT_VALIDATE_ARITHMETIC
DOCUMENT_DEDUPE
DOCUMENT_REVIEW_QUEUE
ACCOUNTING_EXPORT
SUNAT_VALIDATE_CPE         # Peru-specific, only after authoritative design
WHATSAPP_CONFIRM
EXECUTION_TELEMETRY
SAVINGS_EVENT
```

This is **not** a request to stop mining. These are merely current synthesis targets while the quarry continues to ingest broader sources.

## Gate state

- New approved baselines: **0**
- New inspected importable workflow: `ivansiyanko/n8n-invoice-ai`
- New P0 code/architecture sources: Activepieces, invoice2data, paperflow, Docling/docTR
- New exact n8n use-case sources: WhatsApp receipt OCR, WhatsApp invoice processor, multiple invoice validation/review templates

`FAILED_GATE != DELETED` remains invariant.
