# Automation Discovery Standard

Status: **COMMERCIAL / DELIVERY AUTHORITY**
Updated: 2026-09-11

Every client automation starts with process discovery, not workflow building.

## 1. Define the business process

Capture:
- process owner;
- trigger and desired outcome;
- systems/channels involved;
- inputs/outputs;
- current manual steps;
- decisions/approvals;
- exceptions;
- failure/forgetting points;
- volume/frequency;
- regulatory/privacy constraints;
- business hours/SLA.

## 2. Measure the AS-IS baseline

Record at minimum:
- units per week/month;
- manual minutes per unit or batch;
- rework/error rate where measurable;
- waiting/response time;
- people/roles involved;
- loaded hourly cost when the client is comfortable providing it;
- lost/recovered revenue metric only when defensible.

Evidence quality is tagged `client_declared`, `time_study`, `system_data` or `mixed` and mapped into `SavingsBaseline`.

## 3. Simplify before automation

For every step mark one of:

```text
KEEP
REMOVE
COMBINE
STANDARDIZE
AUTOMATE
HUMAN_APPROVAL
EXTERNAL_SYSTEM_OF_RECORD
```

Do not automate a step solely because it already exists.

## 4. Map TO-BE capabilities

Map the simplified process to `workflows/SMB-CAPABILITY-LIBRARY.md` and provider adapters in `workflows/CONNECTOR-MATRIX.md`.

Prefer:

```text
existing APPROVED_BASELINE
> hardened candidate
> compose existing capabilities
> new capability development
```

## 5. Risk classification

Classify side effects:
- low: notifications, drafts, read-only sync;
- medium: CRM/task/calendar updates, document generation;
- high: financial writes, destructive actions, access changes, legal/regulated operations, broad messaging.

High-impact actions default to explicit approval/reconciliation controls.

## 6. Proposal output

Discovery ends with:
- AS-IS map;
- TO-BE map;
- capabilities/connectors required;
- baseline assumptions/confidence;
- scope/non-goals;
- exceptions/manual review paths;
- implementation price/support hypothesis;
- acceptance criteria;
- external costs/dependencies;
- security/data notes;
- owner for each credential/provider account.

No implementation starts while a critical business rule, system-of-record owner, credential owner or acceptance criterion remains unknown.


## 7. Zero-cost pilot preflight

When discovery maps to existing `APPROVED_BASELINE` Savings Workflows, the operator can turn the measured assumptions into a local pilot plan before asking for credentials:

```bash
python tools/savings/pilot_bootstrap.py plan --spec <pilot-spec.json>
```

The preflight:
- rejects workflows that have not reached `APPROVED_BASELINE`;
- maps required provider-neutral connector roles;
- flags unsupported/missing provider choices;
- computes a clearly labeled discovery capacity estimate when volume/time assumptions are present;
- keeps baseline agreement, connector verification and client acceptance as later evidence gates;
- does not provision paid infrastructure.

This tool does not replace client discovery or approval. It makes the transition from discovery to implementation reproducible.
