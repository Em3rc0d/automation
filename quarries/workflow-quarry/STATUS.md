# Workflow Quarry — Status

Updated: 2026-09-11

## Invariant

**No discovered candidate is deleted because it fails a gate.**

A failed candidate is retained under `no-pass-verified/` with source, evidence, blocking reasons and re-entry condition.

Duplicates are also preserved. Semantic deduplication reduces repeated review work but never erases provenance.

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

### Source registry

Registered source corpora: **11**.

Highest-value verified code corpora so far:

- `ScraperNode/awesome-n8n-templates` — repository MIT; **8,224 JSON files** found by GitHub code search at observed ref (includes non-workflow JSON, so not all are counted as workflows); search pools observed: lead 1,102, invoice 284, appointment 147.
- `felipfr/awesome-n8n-workflows` — repository MIT; large aggregation corpus with many concrete P0 candidates, per-workflow provenance kept as a separate redistribution gate.
- `Redsf/n8n-workflows` — MIT; 59 production-style workflows with README/architecture/JSON according to repo metadata.
- `Utsav-Donda/N8N-Workflows` — MIT; 14 documented workflow packages.

Additional repository-level license checks completed:
- `xuanli/awesome-n8n-templates-scrapernode` — MIT fork/mirror of ScraperNode upstream;
- `sander2610/n8n-automation-templates-500` — MIT fork with upstream/source lineage.

License-blocked but preserved:
- `aslammac/n8n-templates` — no license reported by GitHub;
- `pxw3504k-web/free-n8n-workflows` — no license reported by GitHub.

Knowledge-only but preserved:
- `mlnjsh/n8n-workflows-mega` — repository MIT and rich use-case READMEs, but GitHub code search returned zero JSON files during verification. It remains valuable for commercial catalog, test scenarios and backlog, not as an import-ready code corpus.

Other registered sources remain DISCOVERED pending gates.

### Workflow candidates

Explicit source-path candidates tracked across batches 001–004: **at least 41**.

Deeply inspected source candidates: **19**.

One of the inspected appointment candidates is a duplicate-family/variant across independent aggregation corpora; both provenances are retained.

Current inspected areas:
- Lead capture / normalization / CRM / follow-up;
- AI/voice lead qualification;
- invoice generation and email invoice intake;
- QuickBooks invoice sequence;
- email triage and human-review drafts;
- appointments / human approval / calendar creation;
- KPI reporting;
- support ticket classification/routing/resolution;
- website chat qualification + calendar booking;
- PDF generation + outbound invoice delivery.

### no-pass-verified evidence

Explicit no-pass evidence files currently include source- and workflow-level records for:
- `aslammac` license block;
- `pxw3504k` license block;
- `felipfr` aggregation/provenance block;
- `mlnjsh` knowledge-only classification;
- insecure IMAP/TLS invoice candidate;
- QuickBooks toy/hardcoded candidate;
- Acuity trigger-only candidate.

These records are **retained**, not rejected/deleted.

### Approved baselines

`APPROVED_BASELINE = 0`

This is intentional. Discovery and inspection do not equal production certification.

The first promotion to APPROVED_BASELINE requires an **original hardened implementation** plus test evidence under our platform contracts.

## Strongest current hardening targets

```text
LEAD_CAPTURE
LEAD_NORMALIZE
LEAD_DEDUPE
CRM_UPSERT
LEAD_ROUTE_NOTIFY
LEAD_FOLLOWUP_WATCHDOG
EMAIL_CLASSIFY_ROUTE
EMAIL_DRAFT_FOR_REVIEW
INVOICE_GENERATE
INVOICE_INGEST
APPOINTMENT_REQUEST
AVAILABILITY_CHECK
SLOT_HOLD
CALENDAR_CREATE
EXECUTION_TELEMETRY
ERROR_TO_INCIDENT
```

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
→ P0/P1 queue
→ manual/deeper inspection
→ hardening
→ tests
→ approved baseline
```

The current container runtime cannot resolve GitHub for direct bulk cloning, so full local execution over the 8k corpus has **not** been falsely marked complete. GitHub code search and direct file inspection are being used for the live mining pass, while the local bulk indexer is ready for a network-enabled environment.

## Next quarry objective

1. Continue targeted P0 mining inside ScraperNode's 8k corpus.
2. Rank cross-source candidates by capability, safety, dependency burden and reuse potential.
3. Collapse duplicate technical review via semantic fingerprint while retaining all provenance.
4. Write our own first hardened candidates: `LEAD_CAPTURE`, `LEAD_FOLLOWUP_WATCHDOG`, `EMAIL_CLASSIFY_ROUTE`, `INVOICE_INGEST`, `APPOINTMENT_REQUEST`.
5. Run the full test matrix before any `APPROVED_BASELINE` promotion.
