# W3-W11 Capability Factory

W3-W11 extend the baseline library from isolated product-entry workflows into a composable SMB automation operating system. The target is **9 waves x 11 semantic capabilities = 99 new capabilities**, bringing W1-W11 to 121 intended capability boundaries without counting provider/configuration clones.

## Waves

| Wave | Theme | Purpose |
|---|---|---|
| W3 | Lead Orchestration | capture, identity, dedupe, qualification, routing, SLA, follow-up, consent, stage, reactivation, attribution |
| W4 | Quote2Cash | quote intake, pricing, approval, composition, delivery, intent, acceptance, invoicing, reconciliation, collection, cash application |
| W5 | Appointments / Service | availability, booking, confirmation, reminders, reschedule, cancellation, waitlist, no-show recovery, feedback |
| W6 | Smart Inbox / Ops | email normalization, thread context, intent, entity link, attachments, priority, tasks, ownership, guarded drafting, SLA, digest |
| W7 | Support | intake, dedupe, severity, entitlement, routing, knowledge, approval, SLA, updates, resolution, CSAT recovery |
| W8 | Client Onboarding | intake, completeness, requirements, contract packet, e-sign state, provisioning, training, milestones, blockers, handoff, health |
| W9 | Procurement / Inventory | purchase request, approvals, supplier match, RFQ, quote comparison, PO, receipt, three-way match, reorder, backorder, supplier score |
| W10 | Finance / Management | expenses, allocation, duplicate detection, budget policy, payment approval, bank normalization, reconciliation, forecast, anomaly, close, executive brief |
| W11 | Automation OS | connector health, credential expiry, webhook verification, rate limiting, retry, idempotency, execution SLA, incidents, approval policy, savings, retention |

## Source of truth

`catalog.py` defines semantic capabilities and their runtime patterns. `tools/build_waves.py` compiles each capability into an isolated n8n child workflow and two executable probes. Generated output lives under `waves/.generated/` and is intentionally ignored: it is deterministic evidence output, not handwritten authority.

## Gates

`tools/validate_waves.py` enforces count, uniqueness, score, input contract, stable IDs, workflow hashes, secret/credential absence, valid+edge probe completeness and provider-clone exclusion.

`factory/tools/runtime_smoke.sh` builds the current SHA, imports all 99 candidates into pinned n8n 2.38.7, imports 198 domain probes, stops the server to obtain exclusive CLI database ownership, then executes the entire probe matrix in one isolated runtime container. A wrong domain decision is a workflow failure.

## Promotion boundary

Passing the W3-W11 factory does **not** silently rewrite existing W1/W2 evidence and does not promote generated candidates into `workflows/n8n/` without an explicit promotion/seal step. The branch first proves that the semantic catalog is reproducible and runtime-valid. Promotion remains non-destructive and evidence-bound.
