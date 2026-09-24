# Automation Template Taxonomy

Goal: represent common Pyme workflows as reusable templates + tenant configuration, not customer-specific spaghetti.

## Product layers

Do not mix semantic capabilities with customer-facing installable workflows:

```text
CAPABILITY
→ ACTIVE WORK REDUCER
→ SAVINGS WORKFLOW
→ PLUGIN / SOLUTION INSTALLATION
→ AUTOMATION INSTANCE(S)
```

- **CAPABILITY**: provider-neutral semantic primitive.
- **ACTIVE WORK REDUCER**: reusable pattern that removes repetitive handling time.
- **SAVINGS WORKFLOW**: coherent customer-facing process with one measurable savings unit.
- **INSTALLATION**: tenant binding of workflow version + config + connectors + SavingsBaseline.
- **AUTOMATION INSTANCE**: technical execution implementation(s).

The broad solution catalog lives in `SAVINGS-WORKFLOW-CATALOG.md`; the machine-readable registry lives in `SAVINGS-WORKFLOW-REGISTRY.json`. A large number of Savings Workflows does not imply a large number of distinct CAPABILITY entries.

## Naming

```text
<DOMAIN>_<CAPABILITY>@<MAJOR.MINOR>
```

Examples:
- `LEAD_CAPTURE@1.0`
- `LEAD_FOLLOWUP@1.0`
- `QUOTE_GENERATE@1.0`
- `INVOICE_INGEST@1.0`
- `APPOINTMENT_REMINDER@1.0`

## Domains

### LEAD
- intake
- normalization
- dedupe
- CRM upsert
- routing
- scoring
- first response
- delayed follow-up
- stale lead alert
- reactivation

### QUOTE
- request normalization
- pricing/rule lookup
- document generation
- approval
- delivery
- follow-up
- accepted/rejected state

### PAYMENT / COLLECTION
- due-date monitor
- reminder
- overdue classification
- escalation
- payment confirmation

### INVOICE
- intake from email/upload
- OCR/extraction
- validation
- duplicate detection
- accounting/ERP push
- archive
- missing-field exception

### EMAIL
- classification
- priority
- routing
- email → CRM
- email → task
- attachment extraction
- response suggestion
- daily digest

### APPOINTMENT
- booking
- confirmation
- reminder
- cancellation
- reschedule
- waitlist fill
- post-service follow-up

### SUPPORT
- intake
- ticket creation
- classification
- priority/SLA
- FAQ response
- human handoff
- escalation
- close/survey

### ONBOARDING
- new customer record
- folder/workspace creation
- contract/doc generation
- project/task creation
- welcome email
- kickoff scheduling

### DOCUMENT
- classify
- OCR
- structured extraction
- validate
- rename
- archive
- expiration reminder

### REPORTING
- scheduled data aggregation
- KPI calculation
- anomaly flagging
- executive summary
- delivery

### RETENTION
- survey
- NPS/CSAT
- review request
- reactivation
- maintenance/service reminder

## Template contract metadata

Each reusable template stores:

```text
key
version
purpose
trigger type
input schema
output/process-record schema
required connectors
config schema
side effects
approval policy
idempotency strategy
retry policy
incident mapping
savings unit
sensitive fields
provider constraints
test fixtures
rollback notes
source/provenance
license notes
```

## Customer-specific values belong in config

Do not fork workflow logic merely for:
- follow-up delay;
- business timezone;
- sender mailbox;
- CRM pipeline/stage;
- message template;
- maximum retries;
- office hours;
- approval threshold.

Example:

```json
{
  "businessTimezone": "America/Lima",
  "followUpAfterHours": 24,
  "maxAttempts": 3,
  "officeHours": {
    "from": "09:00",
    "to": "18:00"
  },
  "approvalThresholdPen": 1500
}
```

## When a fork is allowed

Fork a template only when business semantics differ materially and configuration would make the shared template harder to understand/test.

Every fork must answer:
- why config cannot express this safely;
- whether change belongs in next template version;
- migration implications;
- tests.

## Promotion path

```text
client-specific experiment
→ proven workflow
→ normalized template
→ second-client reuse
→ versioned catalog
→ productized package
```

A template is not considered reusable until it has passed at least one real production use and has isolated tenant-specific configuration.
