# Initial Baseline Targets

The first approved library should be deliberately small and commercially useful.

## P0 target set

### LeadFlow

- `LEAD_CAPTURE@1.0`
- `LEAD_NORMALIZE_DEDUPE@1.0`
- `LEAD_ROUTE_NOTIFY@1.0`
- `LEAD_FOLLOWUP@1.0`

### Quote2Cash

- `QUOTE_GENERATE_DELIVER@1.0`
- `QUOTE_FOLLOWUP@1.0`
- `PAYMENT_REMINDER@1.0`

### OpsFlow

- `EMAIL_CLASSIFY_ROUTE@1.0`
- `EMAIL_ATTACHMENT_EXTRACT@1.0`
- `INVOICE_INGEST@1.0`
- `INVOICE_VALIDATE_ARCHIVE@1.0`

### Appointments

- `APPOINTMENT_CONFIRM_REMIND@1.0`

### Operations core

- `EXECUTION_TELEMETRY@1.0`
- `ERROR_TO_INCIDENT@1.0`

## P1 target set

- `SUPPORT_INTAKE_ROUTE@1.0`
- `CUSTOMER_ONBOARDING@1.0`
- `EXECUTIVE_BRIEF@1.0`
- `REVIEW_REQUEST@1.0`
- `DOCUMENT_EXTRACT_VALIDATE@1.0`

## Why these first

They map directly to common PyME work:
- leads;
- follow-up;
- quotations;
- collections;
- email operations;
- invoices/documents;
- appointments;
- monitoring of our own automation platform.

The quarry may index thousands of external candidates, but this file defines what we are actually trying to promote first.

## Promotion objective

Before expanding the catalog, aim for:

```text
8–15 APPROVED_BASELINE workflows
```

covering P0 use cases with configuration instead of per-client forks.
