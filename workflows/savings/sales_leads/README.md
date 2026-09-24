# sales leads Savings Workflows

Materialized DESIGN_READY skeletons: **11**

- [LEAD_INTAKE_AUTOMATION@0.1](./LEAD_INTAKE_AUTOMATION@0.1/) — Lead Intake Automation — unit: `lead` — runtime: `function`
- [LEAD_NORMALIZE_AUTOMATION@0.1](./LEAD_NORMALIZE_AUTOMATION@0.1/) — Lead Normalization — unit: `lead` — runtime: `function`
- [LEAD_DEDUPE_AUTOMATION@0.1](./LEAD_DEDUPE_AUTOMATION@0.1/) — Lead Deduplication — unit: `lead` — runtime: `function`
- [LEAD_CRM_UPSERT_AUTOMATION@0.1](./LEAD_CRM_UPSERT_AUTOMATION@0.1/) — Lead to CRM — unit: `lead` — runtime: `function`
- [LEAD_ROUTE_AUTOMATION@0.1](./LEAD_ROUTE_AUTOMATION@0.1/) — Lead Assignment — unit: `lead` — runtime: `function`
- [LEAD_ACKNOWLEDGE_AUTOMATION@0.1](./LEAD_ACKNOWLEDGE_AUTOMATION@0.1/) — Immediate Lead Acknowledgement — unit: `lead` — runtime: `function`
- [LEAD_OWNER_NOTIFY_AUTOMATION@0.1](./LEAD_OWNER_NOTIFY_AUTOMATION@0.1/) — Lead Owner Notification — unit: `lead` — runtime: `function`
- [LEAD_SLA_WATCHDOG_AUTOMATION@0.1](./LEAD_SLA_WATCHDOG_AUTOMATION@0.1/) — Lead SLA Watchdog — unit: `lead reviewed` — runtime: `scheduled`
- [LEAD_FOLLOWUP_AUTOMATION@0.1](./LEAD_FOLLOWUP_AUTOMATION@0.1/) — Lead Follow-up — unit: `follow-up` — runtime: `durable`
- [LEAD_REACTIVATION_AUTOMATION@0.1](./LEAD_REACTIVATION_AUTOMATION@0.1/) — Dormant Lead Reactivation — unit: `lead` — runtime: `scheduled`
- [LEAD_TO_APPOINTMENT_AUTOMATION@0.1](./LEAD_TO_APPOINTMENT_AUTOMATION@0.1/) — Lead to Appointment — unit: `appointment` — runtime: `durable`

Skeletons are not production-certified implementations.
