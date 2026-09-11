# Workflow Quarry

This directory is the ingestion and promotion pipeline for external and internally-created automation workflows.

The purpose is to turn a very large, heterogeneous Internet corpus of n8n/workflow examples into a small, legally usable, technically reviewed, production-grade baseline library for our automation business.

## Non-negotiable rule

External workflow JSON is never considered production-ready merely because it imports into n8n.

A workflow must move through the complete promotion pipeline:

```text
DISCOVERED
  ↓
LICENSE_CHECKED
  ↓
INSPECTED
  ↓
HARDENED
  ↓
TESTED
  ↓
APPROVED_BASELINE
```

The stages are physical folders so the repository itself shows workflow maturity.

```text
quarries/workflow-quarry/
├── 00-discovered/
├── 10-license-checked/
├── 20-inspected/
├── 30-hardened/
├── 40-tested/
├── 50-approved-baseline/
├── MANIFEST.schema.json
├── registry.yaml
└── README.md
```

## Separation of responsibilities

`quarries/workflow-quarry/` contains material still being evaluated.

`workflows/` contains our normalized product taxonomy and eventually the baselines promoted for reuse with clients.

An `APPROVED_BASELINE` artifact may be copied/promoted into a product family such as:

```text
workflows/n8n/leadflow/
workflows/n8n/quote2cash/
workflows/n8n/opsflow/
workflows/n8n/invoices/
workflows/n8n/appointments/
workflows/n8n/support/
workflows/n8n/onboarding/
workflows/n8n/reporting/
```

## Required artifact pair

Every workflow under evaluation must have:

1. the workflow artifact, normally `.json`;
2. a metadata manifest matching `MANIFEST.schema.json`.

Example:

```text
00-discovered/
└── github-aslammac-001/
    ├── workflow.json
    └── manifest.yaml
```

## Promotion gates

### DISCOVERED

We know where the workflow came from and have preserved provenance.

Required:
- source URL;
- repository/source name;
- original path or template ID;
- source commit/tag/date where available;
- retrieval date;
- SHA-256 of the imported artifact;
- initial business category;
- no assumption of commercial reuse rights.

### LICENSE_CHECKED

A human has reviewed the actual licensing/provenance relevant to the workflow.

Required:
- source license identified or explicitly `UNKNOWN`;
- redistribution status;
- commercial-use status;
- attribution requirements;
- upstream/provenance caveats;
- decision: `ALLOW_ADAPT`, `REFERENCE_ONLY`, or `REJECT`.

Unknown or ambiguous licensing never silently becomes approved.

### INSPECTED

The workflow has been technically inspected node by node.

Required review:
- triggers;
- external side effects;
- credentials;
- OAuth/API scopes;
- embedded secrets;
- hardcoded tenant/customer data;
- prompts;
- code nodes;
- HTTP requests;
- community nodes;
- package dependencies;
- persistence;
- destructive actions;
- data leaving the country/provider boundary where relevant;
- error handling;
- idempotency;
- retry behavior;
- PII/sensitive data;
- human approval requirements.

### HARDENED

The workflow has been adapted to our platform contracts and operational standards.

Typical changes:
- remove all secrets and credentials from exported JSON;
- remove customer-specific IDs/URLs;
- use tenant configuration instead of forks;
- normalize inputs;
- enforce idempotency;
- add retries/backoff only where safe;
- map failures to incidents;
- emit `ExecutionEvent` telemetry;
- emit/update `ProcessRecord` where applicable;
- emit Savings Engine metrics;
- add explicit `ApprovalRequest` / human-in-the-loop where required;
- use official provider APIs for production paths;
- redact PII from operational logs;
- define rollback/disable behavior.

### TESTED

The hardened workflow has passed repeatable tests.

Minimum evidence:
- import validation;
- happy path;
- duplicate/idempotency test;
- provider/API failure;
- malformed input;
- auth/credential failure;
- retry behavior;
- tenant isolation where applicable;
- incident generation;
- telemetry validation;
- Savings metrics validation;
- side-effect verification;
- no secrets in export;
- fixture/evidence references.

### APPROVED_BASELINE

The workflow is allowed to serve as a starting point for client delivery.

Required:
- all earlier gates passed;
- stable key/version;
- purpose and supported use case documented;
- required connectors listed;
- configuration schema defined;
- input/output contract defined;
- known limitations documented;
- rollback notes;
- source/provenance preserved permanently;
- license obligations preserved;
- tests linked;
- approval by at least one project maintainer.

`APPROVED_BASELINE` does **not** mean deploy unchanged to every customer. It means this is our trusted starting implementation.

## Rules for bulk Internet corpora

Large repositories containing thousands of JSON files are treated as mining sources, not trusted dependencies.

We may bulk-ingest their metadata and artifacts into `00-discovered` for research, but promotion remains per-workflow or per-provenance cohort.

Never infer that:

```text
repository license == license/provenance of every aggregated workflow
```

unless that fact has actually been established.

## Desired outcome

The quarry should eventually make client delivery look like:

```text
client need
  ↓
search approved baselines
  ↓
select closest baseline
  ↓
apply tenant config/connectors
  ↓
run client-specific acceptance tests
  ↓
deploy
```

not:

```text
client need
  ↓
search Internet again
  ↓
rebuild from zero
```
