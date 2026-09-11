# W1 — Baseline Library Certification

Status: **OPEN / IMPLEMENTATION**  
Branch: `w1/baseline-library`  
K0 base: `8cb866805d895dc185dfaa232eddecaa346ab478`

## Objective

Convert the mined/researched capability map into a reusable, executable and evidence-backed baseline library.

W1 is not complete when workflows merely exist. W1 closes only when the selected first-wave components have crossed the repository pipeline:

```text
DISCOVERED
→ LICENSE_CHECKED
→ INSPECTED
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
```

For original repository-native synthesis, external licensing gates are replaced by explicit `origin: ORIGINAL_SYNTHESIS`; external patterns used as knowledge remain referenced in provenance notes.

## Preservation invariant

No K0 artifact, mined candidate, source record or `no-pass-verified` evidence is deleted as part of W1.

W1 adds artifacts and may supersede older candidates through explicit metadata, but preserves historical provenance.

## Wave 0 — platform primitives

Implementation begins with cross-cutting primitives required by later business workflows:

1. `EXECUTION_TELEMETRY@1.0`
2. `ERROR_TO_INCIDENT@1.0`
3. `SAVINGS_EVENT_EMIT@1.0`
4. `APPROVAL_REQUEST@1.0`
5. `HUMAN_REVIEW_TASK@1.0`

These must be provider-neutral and tenant-aware.

## Wave 1 — revenue intake

After Wave 0 has test evidence:

- `LEAD_CAPTURE@1.0`
- `LEAD_NORMALIZE@1.0`
- `LEAD_DEDUPE@1.0`
- `CRM_UPSERT_CONTACT@1.0`
- `LEAD_ACKNOWLEDGE@1.0`
- `LEAD_FOLLOWUP_WATCHDOG@1.0`

## W1 package rule

A candidate in `30-hardened` should include:

```text
workflow.json
manifest.yaml
config.schema.json
README.md
fixtures/
evidence/TEST-PLAN.md
```

Promotion to `40-tested` additionally requires actual execution evidence against the pinned runtime and documented results.

Promotion to `APPROVED_BASELINE` requires the final `TEST-REPORT.md` and all certification checks to pass.

## Non-goals

W1 does not build the client portal, operator console, billing, visual workflow builder, marketplace or full MK1 product.

## Stop rule

Do not call W1 certified until the repository contains actually tested `APPROVED_BASELINE` packages and the W1 certification ledger is green.
