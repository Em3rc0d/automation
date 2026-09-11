# Quarry — Extended Web Baselines

Research expansion: 2026-09-11

This quarry covers gaps not fully represented in the first research pass: massive workflow collections, client-portal baselines, tutorial/video material and commercial/ROI references.

## A. Massive n8n workflow collections

These repositories are useful as **search corpora**, not as automatically trusted production code.

### aslammac/n8n-templates
URL: https://github.com/aslammac/n8n-templates

Claims 4,300+ templates across 200+ categories, including Gmail/email, Google Sheets, Drive, OpenAI/AI, Slack/Teams, Postgres/SQL and more.

Use:
- local workflow search corpus;
- mine patterns by node/service;
- accelerate prototypes.

Gate:
- verify repository LICENSE and provenance of each aggregated workflow before copying into commercial code.

### xuanli/awesome-n8n-templates-scrapernode
URL: https://github.com/xuanli/awesome-n8n-templates-scrapernode

Claims 8,697+ importable workflows across many integrations/use cases.

Use:
- broad pattern discovery;
- search for rare connector combinations.

Gate:
- aggregation provenance/licensing may differ per source; never infer rights from the aggregator description alone.

### 7and1/n8n-Library
URL: https://github.com/7and1/n8n-Library

Indexes thousands of workflows and includes a local searchable frontend/data-building pipeline.

Interesting reuse pattern:
- parse workflow JSON into a searchable index;
- maintain cached manifest;
- enable local discovery instead of manually browsing GitHub.

Potential internal tool idea:
`workflow-index` that indexes our approved templates + external research corpus with provenance/license metadata.

### felipfr/awesome-n8n-workflows
URL: https://github.com/felipfr/awesome-n8n-workflows

2000+ workflows across business, analytics, communication, CRM, finance, HR, marketing, monitoring, security and other categories. Repository states MIT at repo level.

Use:
- high-priority searchable corpus.

Caution:
- repository itself says workflows were gathered from multiple Internet sources; verify provenance/rights of individual workflow before direct redistribution.

### pxw3504k-web/free-n8n-workflows
URL: https://github.com/pxw3504k-web/free-n8n-workflows

Claims 8,000+ verified workflows and ships a self-hostable search frontend.

Use:
- workflow discovery/search UX patterns;
- searchable local corpus candidate.

### mlnjsh/n8n-workflows-mega
URL: https://github.com/mlnjsh/n8n-workflows-mega

Claims 5,000+ automations across sales, marketing, DevOps, AI/ML, ecommerce, HR, finance and support.

Use:
- thematic mining.

### sander2610/n8n-automation-templates-500
URL: https://github.com/sander2610/n8n-automation-templates-500

Claims 5,000+ real-world templates, including multi-service workflows and error/retry patterns.

Use:
- find larger workflows with edge-case handling.

### Utsav-Donda/N8N-Workflows
URL: https://github.com/Utsav-Donda/N8N-Workflows

Smaller corpus (14 workflows) but valuable because each workflow includes an importable JSON plus setup README.

Use:
- prefer explained workflows over “wall of JSON” when learning implementation patterns.

### Redsf/n8n-workflows
URL: https://github.com/Redsf/n8n-workflows

Production-style workflows with per-folder README, architecture diagram and import-ready JSON.

Use:
- reference for how *our* workflow library should be documented/tested.

### techpranee/n8n-workflows-repo
URL: https://github.com/techpranee/n8n-workflows-repo

Large workflow collection with searchable frontend/SQLite FTS patterns.

Use:
- local research search engine inspiration.

## B. Client portal / multi-tenant baselines

These are especially relevant because our product is not a customer-facing workflow editor; it is a control plane + client portal.

### FlowEngine
URL: https://github.com/FlowEngine-cloud/flowengine

Description: white-label client portal oriented to automation agencies/n8n. Includes client access, execution/workflow overview, templates and instance management.

Why important:
- direct competitor/reference to study;
- validates operator-behind-the-scenes / client-limited-visibility product shape;
- inspect how it maps clients to automation instances and execution views.

Action:
- clone/read before finalizing Operator Console IA;
- inspect exact license and n8n interaction model.

### AutoMaestro
URL: https://github.com/TeoMastro/AutoMaestro

Description: multi-tenant whitelabel frontend for n8n with company management, roles, per-company credentials, template library, dashboard/logging and optional RAG.

Stack reported:
- Next.js
- Supabase/Postgres + RLS/Auth/Storage
- TypeScript
- Zod
- pgvector/OpenAI for RAG

Why important:
- extremely close architectural reference to our planned stack;
- inspect tenant isolation, workflow assignment, credential handling and callback logging;
- do not inherit RAG/feature breadth into MK1.

### SimplerDevelopment
URL: https://github.com/SimplerDevelopment/SimplerDevelopment

Apache-2.0 multi-tenant platform combining admin/client portal, CRM, automations, Google Workspace and AI/RAG patterns.

Why important:
- tenant tests and modular multi-tenant architecture;
- admin/client surface patterns;
- Google Workspace integration.

Risk:
- scope is much larger than ours. Use as code/pattern quarry, not product blueprint.

### client-portal-crm
URL: https://github.com/Sereja-dev/client-portal-crm

Multi-tenant Next.js/TypeScript/Prisma/Supabase client portal/CRM.

Use:
- organization/tenant/team model;
- client portal separation;
- admin surface;
- testing ideas.

Again: do not import CRM/invoicing/billing scope unless evidence requires it.

## C. Video/tutorial quarry

Videos are learning/reference sources, not authoritative security/licensing sources. Record exact implementation idea, then confirm against official docs.

### WhatsApp lead qualification with n8n
URL: https://www.youtube.com/watch?v=Lia4-b3jpbQ

Published: 2025-11-16.

Pattern shown:
- form submission;
- lead scoring;
- Google Sheet/CRM persistence;
- hot/warm/cold routing;
- WhatsApp alerts;
- optional AI conversation.

Useful for:
- LeadFlow prototype;
- qualification/routing UX.

Required production changes:
- official WhatsApp Business API;
- ProcessRecord instead of Sheet as control-plane truth;
- idempotency;
- approval/business rules;
- telemetry.

### Invoice extraction: Drive → Mistral OCR → OpenAI → Sheets/CRM
URL: https://www.youtube.com/watch?v=hnJHjPZSlNQ

Published: 2025-04-05.

Pattern shown:
- watch Google Drive;
- OCR PDF;
- parse key invoice fields with LLM;
- map to Sheet/CRM;
- credential/API handling.

Useful for:
- OpsFlow/invoice intake;
- alternate OCR baseline alongside PaddleOCR/Docling.

Required production changes:
- confidence/validation;
- duplicate invoice guard;
- human review threshold;
- tenant-scoped storage;
- PII/logging controls.

## D. ROI / value-model references

These references support the decision to expose assumptions, automation rate/adoption, review time, runtime cost and payback instead of claiming raw “cash savings”.

### WorkflowTools automation ROI calculator
https://www.workflowtools.space/tools/automation-roi-calculator

Uses released hours, hourly value, recurring cost, one-time setup and payback. Explicitly warns saved time is not automatically cash savings.

### Next Pixel Labs AI Agent ROI calculator
https://www.nextpixellabs.com/tools/ai-agent-roi-calculator

Useful variables:
- monthly cases;
- minutes/case;
- loaded hourly cost;
- percent suitable for automation;
- percent requiring human review;
- review minutes;
- build cost;
- monthly running cost.

These map closely to our Savings Engine and suggest adding `automationCoverage`/`reviewRate` as discovery variables even if events ultimately measure actual units.

### Processly Labs
https://processlylabs.com/automation-roi-calculator

Strong wording principle: model opportunity without pretending it is a promise; separate manual effort from potential capacity.

### RevenueLab payback calculator
https://www.revenuelab.fyi/workflow-automation-payback-calculator

Adds adoption rate and focuses on payback months.

### Red Brick Labs
https://www.redbricklabs.io/blog/workflow-automation-roi-calculator-for-operations-teams

Useful warning: include exceptions, maintenance, adoption and post-launch ownership instead of happy-path savings only.

### n8n case studies
https://n8n.io/case-studies/

Use:
- proof that production automation is measured through workflow/execution volume, reliability and business outcomes;
- collect case-study metric patterns, not vendor claims as our own.

Specific examples to study:
- TUP: https://n8n.io/case-studies/tup/
- Formula Bot: https://n8n.io/case-studies/formula-bot/

### Honest Burgers story
https://blog.n8n.io/how-honest-burgers-use-automation-to-save-100k-per-year/

Use as historical automation-value case study, not pricing evidence for Peru.

## E. Agency/pricing references

### n8n Developers pricing
https://www.n8ndevelopers.com/pricing

Observed public models include hourly blocks, volume packages and monthly retainers.

Use:
- evidence that build + ongoing support/retainer is a normal commercial structure.

### 2026 AI automation agency pricing comparison
https://lurtoagency.com/blog/ai-automation-agency-pricing-2026

Compares publicly listed agency price structures across multiple agencies.

Use:
- market research benchmark only;
- do not directly transplant US/UK pricing to Peru.

## Research conclusion from this extension

We should build an internal **approved workflow knowledge index** rather than manually hunt templates per customer.

Candidate fields:

```text
source_url
source_repo
workflow_path
retrieved_at
license_status
provenance_status
category
nodes_used
providers
trigger_type
side_effects
requires_ai
requires_human_approval
security_notes
quality_grade
adaptation_notes
approved_for_commercial_reuse
```

This turns Internet research into operational leverage while preventing license/provenance mistakes.
