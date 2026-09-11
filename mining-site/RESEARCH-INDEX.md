# Research Index

This folder is the evidence layer behind product/architecture decisions.

## Research policy

Every external baseline must distinguish:

```text
SOURCE
→ what exists externally

EXTRACTION
→ what we learned from it

DECISION
→ what we choose for our product

IMPLEMENTATION
→ our own code/configuration
```

Never silently turn a third-party implementation into an “official” design decision.

## Current corpus

### Source registry
`SOURCES.md`

Contains official docs, repositories, licensing flags and exact intended use.

### Quarries

- `../quarries/N8N-TEMPLATES.md` — reusable n8n patterns and hardening checklist.
- `../quarries/OSS-BASELINES.md` — engines/control-plane/OCR/observability baselines.
- `../quarries/EXTENDED-WEB-BASELINES.md` — mega workflow collections, client portals, videos, ROI/pricing references.

## Research themes already covered

- n8n engine/self-hosting/queue mode/CLI/metrics/license
- Node-RED
- Trigger.dev
- Temporal
- Kestra
- Activepieces
- Windmill
- Automatisch
- Huginn
- Supabase/Postgres/RLS/Vault
- pgvector
- Langfuse / observability candidates
- Docling
- PaddleOCR
- Tesseract
- OCR alternatives
- multilingual embeddings
- OpenAI structured outputs/tool calling
- Google OAuth/Gmail
- HubSpot OAuth
- WhatsApp official + unofficial risk references
- CRM/helpdesk OSS
- n8n template marketplace patterns
- large GitHub workflow collections
- multi-tenant automation/client portal OSS baselines
- ROI/payback calculators
- automation agency pricing models
- n8n case-study metric patterns

## Source quality ranking

1. Official vendor/project documentation.
2. Canonical repository LICENSE/code.
3. Maintained OSS repository with tests/docs.
4. Official template marketplace/example.
5. Practitioner repository/tutorial.
6. Blog/video/community content.

Lower-ranked evidence can generate hypotheses, but security/licensing decisions require higher-ranked confirmation.

## License/provenance statuses

Recommended internal enum:

```text
VERIFIED_PERMISSIVE
VERIFIED_RECIPROCAL
SOURCE_AVAILABLE_REVIEW_REQUIRED
UNVERIFIED
NO_LICENSE
PROVENANCE_MIXED
DO_NOT_COPY
```

## Workflow research index idea

Build a local index over approved/imported external workflow corpora.

Metadata:

```text
id
source_url
repository
path
retrieved_commit
retrieved_at
license_status
provenance_status
category
trigger_type
nodes
providers
side_effects
ai_usage
human_approval_needed
security_notes
quality_grade
commercial_reuse_status
adaptation_notes
```

This is an internal research accelerator, not a customer-facing marketplace.

## Refresh cadence

Weekly during active build:
- n8n release notes/security;
- Supabase changes;
- OpenAI official API docs;
- GitHub candidates used by MK1.

Monthly or when relevant:
- WhatsApp/Meta APIs;
- Google Workspace APIs;
- workflow collections;
- OCR/embedding projects;
- competitor/client-portal projects.

Before adopting any dependency/template:
- re-check exact LICENSE at selected revision;
- record commit/tag;
- validate maintenance/security status;
- confirm provider ToS.
