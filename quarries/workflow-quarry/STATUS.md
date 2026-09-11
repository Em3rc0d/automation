# Workflow Quarry — Status

Updated: 2026-09-11

## Invariant

**No discovered candidate is deleted because it fails a gate.**

A failed candidate is retained under `no-pass-verified/` with source, evidence, blocking reasons and re-entry condition.

Duplicates are also preserved. Semantic deduplication reduces repeated review work but never erases provenance.

A second invariant is now explicit:

> **Mining does not stop when baseline synthesis/build work begins.**

The quarry remains a permanent research/intake system.

## Pipeline

```text
DISCOVERED
→ LICENSE_CHECKED
→ INSPECTED
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
```

Failed gate:

```text
<stage>
→ no-pass-verified/<reason>/
→ preserve evidence
→ remediate if useful
→ re-enter pipeline
```

## Mining progress — live pass

### Primary workflow/code corpora

Highest-value verified code corpora so far:

- `ScraperNode/awesome-n8n-templates` — repository MIT; **8,224 JSON files** found by GitHub code search at observed ref (includes non-workflow JSON, so not all are counted as workflows); search pools observed: lead 1,102, invoice 284, appointment 147.
- `felipfr/awesome-n8n-workflows` — repository MIT; large aggregation corpus with many concrete P0 candidates, per-workflow provenance kept as a separate redistribution gate.
- `Redsf/n8n-workflows` — MIT; 59 production-style workflows with README/architecture/JSON according to repo metadata.
- `Utsav-Donda/N8N-Workflows` — MIT; 14 documented workflow packages.
- `ivansiyanko/n8n-invoice-ai` — MIT; actual importable document/invoice workflow inspected in Batch 005.

License-blocked but preserved:
- `aslammac/n8n-templates` — no license reported by GitHub;
- `pxw3504k-web/free-n8n-workflows` — no license reported by GitHub.

Knowledge-only but preserved:
- `mlnjsh/n8n-workflows-mega` — repository MIT and rich use-case READMEs, but GitHub code search returned zero JSON files during verification. It remains valuable for commercial catalog, test scenarios and backlog, not as an import-ready code corpus.

### Batch 005 — WhatsApp + document + accounting

New directly relevant sources include:
- n8n WhatsApp receipt OCR with Twilio/LlamaParse/AI;
- n8n WhatsApp Cloud API invoice processor with OCR + Sheets + Drive + reply;
- multiple n8n invoice validation/review workflows with strict JSON, arithmetic reconciliation, duplicate detection and exception queues;
- `ivansiyanko/n8n-invoice-ai` actual `workflow.json`;
- `invoice-x/invoice2data` deterministic/template invoice extraction;
- `paperflow` confidence + arithmetic/source-text verification + eval harness;
- Docling / docTR OCR/document parsing baselines;
- Activepieces connector framework and multi-tenant architecture patterns;
- SUNAT electronic boleta/CPE authority as a regional knowledge source.

The Pepito-SAC-style pattern is therefore now represented by multiple independent sources, not one template.

### Batch 006 — control plane / infrastructure

Mining expanded beyond workflows into reusable product/infrastructure baselines:
- `FlowEngine` and `AutoMaestro` for white-label n8n client portals;
- Trigger.dev / Temporal / Windmill for durability, queues and human approval;
- OpenMeter / Lago for usage-event metering and cost/accounting patterns;
- Standard Webhooks / Svix for signatures, replay protection, retries and idempotency;
- Graphile Worker / pg-boss for Postgres-backed async work;
- Infisical for secret governance;
- OpenFGA for future fine-grained authorization;
- OpenTelemetry / Langfuse / Prometheus / Loki for traces, AI cost/latency, metrics and logs.

These sources are documented in Batch 006 even when they are not workflow JSON candidates.

### Workflow candidates

Explicit source-path candidates tracked before Batches 005–006: **at least 41**.

Deeply inspected source candidates before Batch 005: **19**.

Batch 005 adds an additional deeply inspected importable workflow (`ivansiyanko/n8n-invoice-ai`) and a broader set of web-template pattern candidates. Counts are kept conservative: a web search result is not automatically counted as an inspected workflow unless its structure/code was actually examined.

Current inspected/mined areas include:
- Lead capture / normalization / CRM / follow-up;
- AI/voice lead qualification;
- invoice generation and email invoice intake;
- WhatsApp receipt/invoice intake;
- OCR/document preprocessing;
- strict document extraction schemas;
- arithmetic/tax validation;
- duplicate detection;
- review queues / human approval;
- QuickBooks/accounting handoff patterns;
- email triage and human-review drafts;
- appointments / calendar creation / availability;
- KPI/reporting;
- support ticket classification/routing/resolution;
- website chat qualification + booking;
- PDF generation + outbound invoice delivery;
- collections/follow-up;
- control-plane/client-portal patterns;
- usage/cost metering;
- webhook security;
- secrets/authorization/observability.

### no-pass-verified evidence

Explicit no-pass evidence files currently include source- and workflow-level records for:
- license-blocked corpora;
- aggregation/provenance blocks;
- knowledge-only advertised workflow collections without verified workflow JSON;
- insecure IMAP/TLS candidates;
- toy/hardcoded accounting candidates;
- trigger-only/incomplete candidates.

These records are **retained**, not rejected/deleted.

### Approved baselines

`APPROVED_BASELINE = 0`

This remains intentional. Discovery and inspection do not equal production certification.

The quarry continues growing even after the first baselines eventually become approved.

## Current synthesis targets (non-terminal)

Mining evidence currently supports these reusable capabilities, while discovery continues in parallel:

```text
LEAD_CAPTURE
LEAD_NORMALIZE
LEAD_DEDUPE
CRM_UPSERT
LEAD_ROUTE_NOTIFY
LEAD_FOLLOWUP_WATCHDOG

WHATSAPP_INBOUND
WHATSAPP_MEDIA_FETCH
WHATSAPP_CONFIRM

DOCUMENT_STORE_ORIGINAL
DOCUMENT_PREPROCESS
DOCUMENT_CLASSIFY
DOCUMENT_EXTRACT_DETERMINISTIC
DOCUMENT_EXTRACT_AI
DOCUMENT_VALIDATE_ARITHMETIC
DOCUMENT_DEDUPE
DOCUMENT_REVIEW_QUEUE

ACCOUNTING_DOCUMENT_NORMALIZE
ACCOUNTING_EXPORT
SUNAT_VALIDATE_CPE

EMAIL_CLASSIFY_ROUTE
EMAIL_DRAFT_FOR_REVIEW
INVOICE_GENERATE
INVOICE_INGEST
COLLECTION_FOLLOWUP_WATCHDOG

APPOINTMENT_REQUEST
AVAILABILITY_CHECK
SLOT_HOLD
CALENDAR_CREATE

EXECUTION_TELEMETRY
ERROR_TO_INCIDENT
USAGE_METER
VARIABLE_COST_METER
SIGNED_WEBHOOK_RECEIVER
SIGNED_WEBHOOK_SENDER
DURABLE_APPROVAL
ASYNC_JOB
AI_TRACE
CONNECTOR_HEALTHCHECK
```

These targets guide search/hardening priority; they do **not** close the quarry.

## Bulk mining capability

`tools/index_workflow_corpus.py` is the standard ingestion/indexing tool for local corpora.

It produces:
- exact SHA-256 identity;
- normalized semantic fingerprint;
- duplicate semantic groups without deleting any source;
- node/trigger/provider/credential metadata;
- P0/P1/P2 heuristic;
- AI/HTTP/side-effect detection;
- hardcoded URL/email/Sheet-ID/placeholder findings;
- conservative security/quality signals;
- `candidates.jsonl`, `summary.json`, `duplicate-groups.json`.

Target usage:

```text
external clone/download
→ .external-cache/<corpus>
→ index_workflow_corpus.py
→ candidates.jsonl + summary.json + duplicate-groups.json
→ P0/P1/P2 queues
→ inspection / no-pass preservation
→ hardening / tests when appropriate
→ approved baseline
```

The current container runtime cannot resolve GitHub for direct bulk cloning, so full local execution over the 8k corpus has **not** been falsely marked complete. GitHub code search, direct GitHub file inspection and broad web mining are being used for the live pass, while the local bulk indexer is ready for a network-enabled environment.

## Ongoing quarry mandate

The ongoing mandate is not “find enough and stop.” It is:

1. continue mining workflow corpora, GitHub repos, Gists, official template galleries, docs, videos, blogs and OSS infrastructure;
2. preserve everything with provenance/license status, including failed/no-pass candidates;
3. identify duplicates without deleting provenance;
4. keep code-corpus, knowledge-only, architecture and regional-authority sources distinct;
5. periodically synthesize/harden the strongest patterns without stopping intake;
6. expand vertical-specific quarries (accounting, commerce, clinics, workshops, agencies, education, etc.) as evidence grows.
