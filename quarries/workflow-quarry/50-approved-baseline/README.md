# 50 — APPROVED_BASELINE

This stage contains workflows that are approved as trusted starting implementations for client delivery.

`APPROVED_BASELINE` means:

- provenance/licensing reviewed;
- technically inspected;
- hardened to our contracts;
- tests passed with evidence;
- configuration boundaries are known;
- limitations and rollback are documented.

It does **not** mean:

- deploy unchanged to every client;
- skip client-specific acceptance testing;
- assume provider credentials/scopes are valid forever;
- ignore future n8n/provider breaking changes.

## Required package

```text
50-approved-baseline/<baseline-key>@<version>/
├── workflow.json
├── manifest.yaml
├── README.md
├── config.schema.json
├── fixtures/
└── evidence/
    └── TEST-REPORT.md
```

## Naming

Use the canonical taxonomy:

```text
<DOMAIN>_<CAPABILITY>@<MAJOR.MINOR>
```

Examples:

```text
LEAD_CAPTURE@1.0
LEAD_FOLLOWUP@1.0
QUOTE_GENERATE@1.0
INVOICE_INGEST@1.0
APPOINTMENT_REMINDER@1.0
```

## Promotion into product library

Once approved, the normalized artifact may be promoted/copied into:

```text
workflows/n8n/<product-family>/<baseline-key>@<version>/
```

The original quarry manifest and provenance chain remain preserved.

## Client deployment gate

Even approved baselines still require:
- tenant configuration;
- connector credential setup;
- provider scope validation;
- client-specific fixture/acceptance test;
- Savings baseline agreement if value reporting is enabled;
- approval policy confirmation;
- production readiness check.

## Revocation

An approved baseline can be revoked when:
- a vulnerability is found;
- provider API changes invalidate behavior;
- license/provenance changes;
- repeated production incidents reveal an unsafe assumption;
- a replacement major version supersedes it.

Revocation must preserve history rather than deleting evidence.
