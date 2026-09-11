# W2 — Sophisticated Document & Accounting Wave

Status: BUILDING
Branch: `w2/document-accounting-wave`
Factory profile: `n8n-base-js-v1` / n8n `2.38.7`

## Purpose

W2 converts the strongest document, receipt/invoice, WhatsApp/email intake, accounting and human-review patterns from the quarry into a small set of dense, provider-agnostic capabilities.

**Quality rule:** W2 does not optimize for workflow count. A component is admitted only when it encapsulates a meaningful reusable business capability with validation, deterministic identity/idempotency, explicit exception paths, tenant context and auditable output.

Thousands of mined workflows are evidence and raw material. They are not a target count for the production library.

## W2/11 capability set

1. `OMNICHANNEL_DOCUMENT_INTAKE` — normalizes WhatsApp, email, web upload and API intake into one document envelope; rejects unsupported source/missing identity and marks suspicious media metadata for review.
2. `MEDIA_FETCH_GUARD` — creates a provider-agnostic secure media-fetch request with size/MIME constraints, correlation and replay-safe identity; blocks disallowed media before fetch.
3. `DOCUMENT_PROVENANCE_STORE` — creates immutable original-document storage/provenance records using content hash + source identity + tenant scope.
4. `DOCUMENT_CLASSIFY_CONFIDENCE` — consumes classifier evidence, normalizes class taxonomy and uses confidence/margin thresholds to accept, review or reject classification without irreversible autonomous action.
5. `DOCUMENT_EXTRACT_SMART` — orchestrates deterministic-first extraction with AI fallback/review semantics; preserves field-level confidence and provenance rather than flattening everything into one opaque result.
6. `FINANCIAL_DOCUMENT_VALIDATE` — validates subtotal/tax/total arithmetic, currency, issue date, document identity and tolerance; emits structured validation findings and a review decision.
7. `DOCUMENT_DEDUPE_COMPOSITE` — combines content hash, issuer/document number and financial/date fingerprints; reports exact/probable/new with deterministic keys.
8. `ACCOUNTING_DOCUMENT_NORMALIZE` — maps invoices/receipts/boletas and extracted fields into a canonical accounting-document contract with normalized amounts, tax, parties and evidence metadata.
9. `REVIEW_EXCEPTION_ORCHESTRATOR` — aggregates low-confidence fields, validation failures, duplicate risk and policy flags into one human-review task with priority/reasons and deterministic identity.
10. `ACCOUNTING_EXPORT_DISPATCH` — produces an idempotent provider-agnostic accounting-export action with destination adapter key, canonical payload, audit context and controlled retry semantics.
11. `INTAKE_ACKNOWLEDGE` — emits a channel-neutral acknowledgement/result action for WhatsApp/email/web/API, without binding the baseline to a specific provider credential.

## Deliberate exclusions

- OCR binaries, Python models, GPU models and community n8n nodes are not hidden inside this wave; the certified base profile cannot claim them.
- OCR/AI/storage/provider operations are invoked through internal connector/control-plane contracts and may later gain separately certified runtime profiles.
- SUNAT-specific CPE validation remains an adapter/vertical capability rather than contaminating the common accounting core.
- No workflow embeds provider secrets, tenant IDs, Sheet IDs, phone numbers, email addresses or customer-specific policy values.

## Required sophistication gates

Every W2 component must demonstrate, where applicable:

- strict tenant/input validation;
- deterministic idempotency or identity key;
- valid happy path;
- malformed/missing input fail-closed;
- duplicate/replay behavior;
- transient provider failure and bounded retry;
- permanent provider failure visibility;
- configuration failure visibility;
- secret/credential scan;
- PII-safe error output expectations;
- branching or policy decision relevant to the capability;
- provenance/confidence retention for probabilistic document processing;
- source HARDENED package preservation after TESTED/APPROVED promotion.

## W2 exit gate

W2 is not complete because 11 folders exist. It is complete only when all 11 are present as HARDENED, TESTED and APPROVED_BASELINE packages, installed under `workflows/n8n`, with runtime evidence and all repository/factory/release gates green on the authoritative SHA.
