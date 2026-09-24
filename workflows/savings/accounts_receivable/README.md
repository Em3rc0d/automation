# accounts receivable Savings Workflows

Materialized DESIGN_READY skeletons: **9**

- [AR_OPEN_INVOICE_IMPORT_AUTOMATION@0.1](./AR_OPEN_INVOICE_IMPORT_AUTOMATION@0.1/) — Open Invoice Import — unit: `invoice` — runtime: `scheduled`
- [AR_AGING_AUTOMATION@0.1](./AR_AGING_AUTOMATION@0.1/) — AR Aging Calculation — unit: `invoice` — runtime: `scheduled`
- [PAYMENT_REMINDER_AUTOMATION@0.1](./PAYMENT_REMINDER_AUTOMATION@0.1/) — Payment Reminder — unit: `invoice` — runtime: `scheduled`
- [PAYMENT_ESCALATION_AUTOMATION@0.1](./PAYMENT_ESCALATION_AUTOMATION@0.1/) — Payment Escalation — unit: `invoice` — runtime: `durable`
- [PAYMENT_RECEIVED_SYNC_AUTOMATION@0.1](./PAYMENT_RECEIVED_SYNC_AUTOMATION@0.1/) — Payment Received Sync — unit: `payment` — runtime: `function`
- [PAYMENT_RECONCILIATION_AUTOMATION@0.1](./PAYMENT_RECONCILIATION_AUTOMATION@0.1/) — Payment Reconciliation — unit: `payment` — runtime: `function`
- [COLLECTION_OWNER_ALERT_AUTOMATION@0.1](./COLLECTION_OWNER_ALERT_AUTOMATION@0.1/) — Collection Owner Alert — unit: `invoice` — runtime: `scheduled`
- [AR_WEEKLY_SUMMARY_AUTOMATION@0.1](./AR_WEEKLY_SUMMARY_AUTOMATION@0.1/) — AR Weekly Summary — unit: `report` — runtime: `scheduled`
- [DISPUTE_INTAKE_AUTOMATION@0.1](./DISPUTE_INTAKE_AUTOMATION@0.1/) — Invoice Dispute Intake — unit: `dispute` — runtime: `function`

Skeletons are not production-certified implementations.
