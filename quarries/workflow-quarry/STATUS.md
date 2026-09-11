# Workflow Quarry — Status

Updated: 2026-09-11

## Invariant

**No discovered candidate is deleted because it fails a gate.**

A failed candidate is retained under `no-pass-verified/` with source, evidence, blocking reasons and re-entry condition.

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

## Mining progress — first live pass

### Source registry

Registered source corpora: **10**.

Repository-level license checks completed for:
- `Utsav-Donda/N8N-Workflows` — MIT;
- `Redsf/n8n-workflows` — MIT;
- `felipfr/awesome-n8n-workflows` — MIT at repository level, per-workflow provenance retained as a separate gate;
- `xuanli/awesome-n8n-templates-scrapernode` / `ScraperNode/awesome-n8n-templates` — MIT at repository/fork level, per-template provenance separate;
- `mlnjsh/n8n-workflows-mega` — MIT at repository level;
- `sander2610/n8n-automation-templates-500` — MIT fork with source lineage.

License-blocked but preserved:
- `aslammac/n8n-templates` — no license reported by GitHub;
- `pxw3504k-web/free-n8n-workflows` — no license reported by GitHub.

Other registered corpora remain DISCOVERED pending their gate pass.

### Workflow candidates

Explicit workflow candidates tracked across batches 001–003: **at least 33 unique candidates**.

Deeply inspected: **16**.

Current inspected areas:
- Lead capture / normalization / CRM / follow-up;
- AI lead qualification;
- invoice generation and email invoice intake;
- QuickBooks invoice sequence;
- email triage and human-review drafts;
- appointments / human approval / calendar creation;
- KPI reporting;
- support ticket classification/routing/resolution;
- website chat qualification + calendar booking.

### no-pass-verified evidence

The repository currently contains explicit no-pass records at both source and workflow level, including:
- license-blocked mega/source corpora;
- aggregation/provenance block;
- insecure IMAP/TLS candidate;
- QuickBooks toy/hardcoded candidate;
- Acuity trigger-only candidate.

These records are **retained**, not rejected/deleted.

### Approved baselines

`APPROVED_BASELINE = 0`

This is intentional. Discovery and inspection do not equal production certification.

The first promotion to APPROVED_BASELINE requires an **original hardened implementation** plus test evidence under our platform contracts.

## Strongest current hardening targets

P0 synthesis candidates:

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

`tools/index_workflow_corpus.py` is now the standard ingestion/indexing tool for large local corpora.

It produces candidate metadata and risk signals without approving or deleting workflows.

Target usage:

```text
external clone/download
→ .external-cache/<corpus>
→ index_workflow_corpus.py
→ candidates.jsonl + summary.json
→ P0/P1 queue
→ manual/deeper inspection
→ hardening
→ tests
→ approved baseline
```

## Next quarry objective

The next meaningful milestone is not “download 8,000 files”. It is:

1. run the indexer over the largest license/provenance-eligible corpora;
2. rank P0/P1 candidates;
3. select the best cross-source patterns for each reusable capability;
4. write our own hardened `LEAD_CAPTURE`, `LEAD_FOLLOWUP_WATCHDOG`, `EMAIL_CLASSIFY_ROUTE`, `INVOICE_INGEST` and `APPOINTMENT_REQUEST` candidates;
5. execute the full test matrix before any `APPROVED_BASELINE` promotion.
