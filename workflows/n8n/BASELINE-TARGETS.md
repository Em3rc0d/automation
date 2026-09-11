# Baseline Promotion Roadmap

The quarry is broad and continuous. `workflows/SMB-CAPABILITY-LIBRARY.md` is the complete current capability target map for common PyME automation. This file defines the **promotion order**, not the limit of what we mine.

## Invariant

```text
MINING NEVER STOPS
+
CERTIFICATION HAPPENS IN WAVES
```

We do not wait for every capability to be certified before selling the first solutions, but we also do not stop discovering/documenting later capabilities.

## Wave 0 — platform primitives

- `EXECUTION_TELEMETRY@1.0`
- `ERROR_TO_INCIDENT@1.0`
- `APPROVAL_REQUEST@1.0`
- `HUMAN_REVIEW_TASK@1.0`
- `SAVINGS_EVENT_EMIT@1.0`

## Wave 1 — LeadFlow / revenue intake

- `LEAD_CAPTURE@1.0`
- `LEAD_NORMALIZE@1.0`
- `LEAD_DEDUPE@1.0`
- `LEAD_SCORE@1.0`
- `LEAD_ROUTE@1.0`
- `CRM_UPSERT_CONTACT@1.0`
- `LEAD_ACKNOWLEDGE@1.0`
- `LEAD_FOLLOWUP_WATCHDOG@1.0`

## Wave 2 — Appointments + Quote2Cash

- `APPOINTMENT_REQUEST@1.0`
- `AVAILABILITY_CHECK@1.0`
- `SLOT_HOLD@1.0`
- `APPOINTMENT_CREATE@1.0`
- `APPOINTMENT_CONFIRM@1.0`
- `APPOINTMENT_REMIND@1.0`
- `QUOTE_GENERATE_DOC@1.0`
- `QUOTE_APPROVAL@1.0`
- `QUOTE_DELIVER@1.0`
- `QUOTE_FOLLOWUP@1.0`
- `INVOICE_CREATE_FROM_WIN@1.0`
- `PAYMENT_REMINDER@1.0`

## Wave 3 — Smart Inbox + documents + AP

- `EMAIL_CLASSIFY_ROUTE@1.0`
- `EMAIL_ATTACHMENT_EXTRACT@1.0`
- `DOCUMENT_CLASSIFY@1.0`
- `OCR_EXTRACT@1.0`
- `RECEIPT_OCR_EXTRACT@1.0`
- `INVOICE_OCR_EXTRACT@1.0`
- `ACCOUNTING_NORMALIZE@1.0`
- `DOCUMENT_ARITHMETIC_VALIDATE@1.0`
- `DOCUMENT_DUPLICATE_DETECT@1.0`
- `DOCUMENT_EXCEPTION_REVIEW@1.0`
- `ACCOUNTING_EXPORT@1.0`
- `DOCUMENT_ARCHIVE@1.0`

## Wave 4 — support + client onboarding + retention

- `SUPPORT_INTAKE@1.0`
- `TICKET_DEDUPE@1.0`
- `TICKET_CLASSIFY@1.0`
- `TICKET_PRIORITY@1.0`
- `TICKET_CREATE@1.0`
- `TICKET_ROUTE@1.0`
- `SLA_WATCHDOG@1.0`
- `SUPPORT_DRAFT_REPLY@1.0`
- `SUPPORT_HUMAN_APPROVAL@1.0`
- `CLIENT_WON_TRIGGER@1.0`
- `CLIENT_FOLDER_CREATE@1.0`
- `CLIENT_PROJECT_CREATE@1.0`
- `CLIENT_TASK_CHECKLIST@1.0`
- `CLIENT_WELCOME_MESSAGE@1.0`
- `FEEDBACK_REQUEST@1.0`
- `NPS_CSAT_SCORE@1.0`
- `DETRACTOR_ALERT@1.0`
- `POSITIVE_REVIEW_REQUEST@1.0`

## Wave 5 — AR, expenses, procurement and inventory

- `AR_AGING_CALCULATE@1.0`
- `PAYMENT_ESCALATION@1.0`
- `PAYMENT_RECONCILE@1.0`
- `EXPENSE_SUBMIT@1.0`
- `EXPENSE_POLICY_CHECK@1.0`
- `EXPENSE_DUPLICATE_CHECK@1.0`
- `EXPENSE_MANAGER_APPROVAL@1.0`
- `PURCHASE_REQUEST@1.0`
- `PURCHASE_APPROVAL_ROUTE@1.0`
- `BUDGET_CHECK@1.0`
- `PO_GENERATE@1.0`
- `PO_APPROVE@1.0`
- `PO_SEND@1.0`
- `THREE_WAY_MATCH@1.0`
- `ORDER_INGEST@1.0`
- `INVENTORY_CHECK@1.0`
- `INVENTORY_SYNC@1.0`
- `LOW_STOCK_ALERT@1.0`
- `FULFILLMENT_ROUTE@1.0`
- `ORDER_STATUS_NOTIFY@1.0`

## Wave 6 — HR/internal ops

- `NEW_HIRE_VALIDATE@1.0`
- `USER_ACCOUNT_PROVISION@1.0`
- `EMPLOYEE_ONBOARDING_CHECKLIST@1.0`
- `LEAVE_REQUEST@1.0`
- `LEAVE_APPROVAL@1.0`
- `OFFBOARDING_TRIGGER@1.0`
- `ACCESS_REVOKE@1.0`
- `OFFBOARDING_AUDIT@1.0`
- `ACCESS_REQUEST@1.0`
- `ACCESS_APPROVAL@1.0`

## Wave 7 — reporting/data/project ops/marketing

- `KPI_CALCULATE@1.0`
- `TREND_CALCULATE@1.0`
- `THRESHOLD_ALERT@1.0`
- `DAILY_EXECUTIVE_BRIEF@1.0`
- `WEEKLY_EXECUTIVE_BRIEF@1.0`
- `SAVINGS_ROLLUP@1.0`
- `ENTITY_SYNC_ONE_WAY@1.0`
- `ENTITY_SYNC_BIDIRECTIONAL@1.0`
- `SYNC_CONFLICT_QUEUE@1.0`
- `DATA_QUALITY_CHECK@1.0`
- `WORK_REQUEST_INTAKE@1.0`
- `WORK_ORDER_CREATE@1.0`
- `WORK_ASSIGN@1.0`
- `WORK_SLA_WATCHDOG@1.0`
- `SERVICE_MAINTENANCE_REMINDER@1.0`
- `CAMPAIGN_LEAD_CAPTURE@1.0`
- `AUDIENCE_SYNC@1.0`
- `EVENT_REGISTRATION@1.0`
- `EVENT_REMINDER@1.0`

## Regional adapters

Regional/legal/tax adapters are promoted separately from generic OCR/process pieces. Example:

- `CPE_VALIDATE_PERU@1.0` — only after authoritative SUNAT contract/evidence is closed.

## Full target authority

See:

- `workflows/SMB-CAPABILITY-LIBRARY.md` — business capability inventory.
- `workflows/CONNECTOR-MATRIX.md` — provider adapter inventory.
- `quarries/workflow-quarry/` — source candidates and promotion evidence.

The number of eventual approved baselines is evidence-driven. We do **not** cap the trusted library at 8–15; that number only described the earliest commercially useful tranche.
