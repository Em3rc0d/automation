# Mining Site — Source Registry

Research date: 2026-09-11

Purpose: preserve the sources, licensing constraints, exact utility and adoption priority behind the platform. This is not a generic bookmark list.

## Provenance levels

- **OFFICIAL** — vendor/project docs or canonical repository.
- **REPOSITORY** — source code repository inspected as implementation baseline.
- **TEMPLATE** — reusable workflow/example; license must be checked individually.
- **REFERENCE** — useful pattern/benchmark, not necessarily reusable code.

## P0 — foundational

| Resource | URL | Provenance | License / constraint | Exact use |
|---|---|---|---|---|
| n8n | https://github.com/n8n-io/n8n | REPOSITORY | Sustainable Use License; commercial gate | Initial internal workflow engine; connectors/webhooks/cron/branching |
| n8n docs | https://docs.n8n.io/ | OFFICIAL | Documentation | Self-hosting, CLI, queue mode, credentials, metrics |
| n8n workflows | https://n8n.io/workflows/ | TEMPLATE | Check template terms individually | Workflow patterns and fast baselines |
| Supabase | https://github.com/supabase/supabase | REPOSITORY | Apache-2.0 repo main | Postgres/Auth/Storage/control plane |
| Supabase RLS | https://supabase.com/docs/guides/database/postgres/row-level-security | OFFICIAL | Docs | Tenant isolation baseline |
| Supabase Vault | https://supabase.com/docs/guides/database/vault | OFFICIAL | Docs | Candidate encrypted secret store behind our abstraction |
| OpenAI Node | https://github.com/openai/openai-node | REPOSITORY | Apache-2.0 | TS SDK for structured extraction/tools |
| Structured Outputs | https://platform.openai.com/docs/guides/structured-outputs | OFFICIAL | API terms | Typed extraction/classification |
| Function calling | https://platform.openai.com/docs/guides/function-calling | OFFICIAL | API terms | Controlled tool invocation |
| Google OAuth server flow | https://developers.google.com/identity/protocols/oauth2/web-server | OFFICIAL | Google terms | OAuth state, offline access, refresh tokens |
| Gmail API | https://developers.google.com/workspace/gmail/api | OFFICIAL | Google terms | Email trigger/read/label/thread integrations |
| WhatsApp Business Platform | https://developers.facebook.com/docs/whatsapp/ | OFFICIAL | Meta terms | Production messaging default |
| HubSpot OAuth | https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/oauth/working-with-oauth | OFFICIAL | HubSpot terms | CRM connector pattern |

## P1 — high-value OSS baselines

| Project | URL | License signal | Use |
|---|---|---|---|
| Node-RED | https://github.com/node-red/node-red | Apache-2.0 | Permissive alternative workflow engine, edge/event patterns |
| Trigger.dev | https://github.com/triggerdotdev/trigger.dev | Apache-2.0 | Durable TypeScript jobs, AI/background jobs |
| Temporal | https://github.com/temporalio/temporal | MIT | Durable workflows at higher criticality/scale; not MK1 |
| Kestra | https://github.com/kestra-io/kestra | Apache-2.0 | Event/data orchestration reference |
| Activepieces | https://github.com/activepieces/activepieces | Verify current LICENSE | Automation/connectors alternative |
| Windmill | https://github.com/windmill-labs/windmill | Mixed surface; verify edition | Code-first jobs/scripts/workflows reference |
| Automatisch | https://github.com/automatisch/automatisch | Verify current LICENSE | Zapier-like architecture patterns |
| Huginn | https://github.com/huginn/huginn | Verify HEAD | Historical agent/event patterns |
| pgvector | https://github.com/pgvector/pgvector | PostgreSQL-style permissive | RAG/vector search without extra DB |
| Langfuse | https://github.com/langfuse/langfuse | Verify current LICENSE | LLM traces/cost/evals, later phase |
| OpenTelemetry JS | https://github.com/open-telemetry/opentelemetry-js | Verify HEAD | Standard tracing/metrics |
| Prometheus | https://github.com/prometheus/prometheus | Permissive; verify HEAD | Runtime metrics |
| Grafana | https://github.com/grafana/grafana | AGPL surface; legal review | Internal dashboards only if required |

## P1 — Document AI / OCR / retrieval

| Project/model | URL | License | Exact utility |
|---|---|---|---|
| Docling | https://github.com/docling-project/docling | MIT | PDF/DOCX/PPTX/XLSX/HTML → structured content |
| PaddleOCR | https://github.com/PaddlePaddle/PaddleOCR | Apache-2.0 | OCR + document structure, multilingual |
| Tesseract | https://github.com/tesseract-ocr/tesseract | Apache-2.0 | Local/traditional OCR fallback |
| OCRmyPDF | https://github.com/ocrmypdf/OCRmyPDF | Verify HEAD | Add OCR text layer to scanned PDFs |
| docTR | https://github.com/mindee/doctr | Verify HEAD | Deep-learning OCR patterns |
| pypdf | https://github.com/py-pdf/pypdf | Verify HEAD | Lightweight digital PDF extraction |
| BGE-M3 | https://huggingface.co/BAAI/bge-m3 | MIT | Multilingual embeddings; only when RAG is justified |
| multilingual-e5-large | https://huggingface.co/intfloat/multilingual-e5-large | Verify model card | Alternate multilingual embeddings |

## P1 — business-system references

| Project | URL | Use | Constraint |
|---|---|---|---|
| Twenty | https://github.com/twentyhq/twenty | CRM architecture/integration reference | Verify current LICENSE before copying |
| Chatwoot | https://github.com/chatwoot/chatwoot | Omnichannel/helpdesk integration reference | Verify license/edition |
| EspoCRM | https://github.com/espocrm/espocrm | CRM API/reference | Verify current license |
| Evolution API | https://github.com/EvolutionAPI/evolution-api | WhatsApp prototyping/research | Non-official channel risk; not production default |
| Baileys | https://github.com/WhiskeySockets/Baileys | WhatsApp Web protocol research | Not production default; ToS/stability risk |

## P2 — RAG/framework references

- https://github.com/run-llama/llama_index
- https://github.com/deepset-ai/haystack
- https://github.com/langchain-ai/langchain
- https://github.com/qdrant/qdrant

Rule: do not introduce any of these into MK1 without a paying use case that cannot be solved simply.

## Official operational references

- n8n queue mode: https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/enable-queue-mode
- n8n community edition feature matrix: https://docs.n8n.io/deploy/host-n8n/community-edition-features
- n8n CLI/import-export: https://docs.n8n.io/deploy/host-n8n/configure-n8n/use-the-command-line
- n8n Prometheus metrics: https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/enable-prometheus-metrics
- GitHub licensing guidance: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
- GitHub Actions hardening: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
- Peru data-protection starting point: https://www.gob.pe/ and official JUS/ANPD publications for Ley 29733 and D.S. 016-2024-JUS. Legal review required before production contracts.

## Licensing rule

```text
MIT / Apache / PostgreSQL-style
→ usually adoptable with required notices

GPL / AGPL
→ legal review before distribution/integration decisions

source-available / Sustainable Use
→ commercial/legal gate

NOASSERTION / unclear metadata
→ read LICENSE at the exact commit before reuse

no LICENSE
→ do not assume reuse rights
```

## Continuous research queries

GitHub themes:
- workflow automation
- n8n workflow JSON
- multi-tenant RLS Supabase
- invoice extraction
- document OCR
- CRM open source
- LLM observability
- WhatsApp API TypeScript

Hugging Face themes:
- multilingual embeddings
- Spanish embeddings
- document OCR
- invoice extraction
- document understanding
- table extraction
- multilingual reranker

Research must record: source URL, retrieval date, license at inspected revision, exact reusable pattern, risk, priority and whether code may actually be copied.
