# Approved n8n Baseline Library

This directory is the production-oriented destination for n8n workflows promoted from `quarries/workflow-quarry/` after passing:

```text
DISCOVERED
→ LICENSE_CHECKED
→ INSPECTED
→ HARDENED
→ TESTED
→ APPROVED_BASELINE
```

No raw Internet workflow belongs here.

## Intended product families

```text
workflows/n8n/
├── leadflow/
├── quote2cash/
├── opsflow/
├── invoices/
├── collections/
├── appointments/
├── support/
├── onboarding/
├── reporting/
└── retention/
```

Directories are created when the first baseline for that family is actually approved; we avoid empty catalog theater.

## Baseline package

```text
<family>/<BASELINE_KEY>@<VERSION>/
├── workflow.json
├── manifest.yaml
├── config.schema.json
├── README.md
├── fixtures/
└── evidence/
    └── TEST-REPORT.md
```

## Rule

`workflow.json` must contain **zero client credentials and zero client-specific business identifiers**.

Customer-specific behavior belongs in configuration/connectors unless business semantics genuinely require a new version/fork.

## Client deployment

An approved baseline is a trusted starting point, not an automatic deployment. Every client installation still requires connector setup, configuration, acceptance tests, approval-policy confirmation and production-readiness verification.
