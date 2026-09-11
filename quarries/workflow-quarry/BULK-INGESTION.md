# Bulk Ingestion Policy

We **do** want to exploit large external workflow corpora aggressively. We do **not** want to turn the public repository into an uncontrolled mirror of third-party code with unknown provenance.

That distinction is intentional.

## Two-layer model

```text
Internet corpora
   ↓
LOCAL / EPHEMERAL RAW CACHE
   ↓
metadata + hashes + provenance index
   ↓
00-discovered
   ↓
LICENSE_CHECKED → INSPECTED → HARDENED → TESTED → APPROVED_BASELINE
```

### Layer A — raw external cache

Purpose:
- clone/download thousands of JSON workflows quickly;
- perform local search/indexing;
- inspect node/provider patterns;
- identify candidates worth promotion.

Default location:

```text
quarries/workflow-quarry/.external-cache/
```

This path is intentionally ignored by Git.

The cache may contain third-party material only for research/inspection under the applicable source terms. It is not automatically redistributed through our repository.

### Layer B — repository corpus

What is committed:
- source registry;
- URL/repository/path/commit;
- hashes;
- category/tags/providers;
- license/provenance evidence;
- inspection findings;
- our hardening changes;
- test evidence;
- approved workflow artifacts only when rights permit redistribution/adaptation.

This gives us the speed of mining thousands of workflows without losing provenance or polluting trusted baselines.

## Bulk discovery sources currently registered

See `registry.yaml` for the canonical list. Current high-volume sources include repositories claiming approximately 2,000 to 8,697+ workflows.

## Intake algorithm

For each source:

```text
1. pin repository commit/tag
2. enumerate candidate JSON files
3. calculate SHA-256
4. parse n8n workflow structure
5. extract node types
6. extract integrations/providers
7. detect trigger types
8. detect Code nodes
9. detect HTTP Request nodes/domains
10. detect credential references
11. scan for likely embedded secrets
12. classify business domain
13. estimate risk
14. write metadata record
15. keep raw JSON in external cache by default
```

## Candidate ranking

Prioritize workflows that map to our commercial catalog:

```text
P0
- LeadFlow
- Quote2Cash
- OpsFlow
- invoice intake/OCR
- payment reminders/collections
- appointments/reminders

P1
- customer support/ticketing
- client onboarding
- executive reporting
- document extraction
- retention/reviews

P2+
- RAG/chatbots
- niche integrations
- complex AI-agent workflows
- developer/DevOps automations
```

Within a category, favor:
- official APIs;
- fewer community nodes;
- explicit error handling;
- clear setup docs;
- simple credential model;
- idempotency/dedup patterns;
- human approval where appropriate;
- recent provider APIs;
- permissive, clearly attributable provenance.

## Secret scanning

Before a raw workflow can be committed at any stage, inspect for at least:

```text
API keys
tokens
Bearer headers
passwords
OAuth refresh/access tokens
private URLs containing credentials
webhook secrets
client secrets
real email addresses/customer data
real phone numbers/customer data
```

Anything suspicious blocks promotion until redacted.

## Why not commit all raw JSON immediately?

Because the repository is public and many mega-collections are aggregations. Bulk committing their contents could:
- redistribute material under unclear terms;
- erase provenance;
- make it hard to distinguish trusted from untrusted workflows;
- expose secrets or customer-like sample data;
- create thousands of noisy files that still require individual technical review;
- falsely signal that everything in the repository is supported.

The correct goal is not “own 8,000 JSON files in Git”.

The correct goal is:

> Search 8,000+ candidates, know exactly where they came from, and promote the best reusable workflows into a small production-grade library.

## Promotion throughput target

Initial target:

```text
Discover/index: thousands
License/provenance review: hundreds worth considering
Technical inspection: tens
Hardened/tested: 15–30 high-value workflows
Approved P0 baseline library: 8–15 workflows
```

Those 8–15 should cover a large fraction of early PyME engagements because each baseline is configurable and composable.

## No deletion of provenance

Every promoted workflow must keep a permanent chain:

```text
approved baseline
→ hardened candidate
→ inspected candidate
→ license evidence
→ discovered source
→ original URL + commit/path/hash
```

Even if the source disappears later, our recorded evidence remains.
