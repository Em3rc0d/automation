# data sync it Savings Workflows

Materialized DESIGN_READY skeletons: **16**

- [ENTITY_SYNC_ONE_WAY_AUTOMATION@0.1](./ENTITY_SYNC_ONE_WAY_AUTOMATION@0.1/) — One-way Entity Sync — unit: `entity` — runtime: `function`
- [ENTITY_SYNC_BIDIRECTIONAL_AUTOMATION@0.1](./ENTITY_SYNC_BIDIRECTIONAL_AUTOMATION@0.1/) — Bidirectional Entity Sync — unit: `entity` — runtime: `durable`
- [FIELD_MAP_TRANSFORM_AUTOMATION@0.1](./FIELD_MAP_TRANSFORM_AUTOMATION@0.1/) — Field Mapping Transform — unit: `entity` — runtime: `function`
- [MASTER_DATA_DEDUPE_AUTOMATION@0.1](./MASTER_DATA_DEDUPE_AUTOMATION@0.1/) — Master Data Deduplication — unit: `record` — runtime: `scheduled`
- [MASTER_DATA_ENRICH_AUTOMATION@0.1](./MASTER_DATA_ENRICH_AUTOMATION@0.1/) — Master Data Enrichment — unit: `record` — runtime: `function`
- [SYNC_CONFLICT_QUEUE_AUTOMATION@0.1](./SYNC_CONFLICT_QUEUE_AUTOMATION@0.1/) — Sync Conflict Queue — unit: `conflict` — runtime: `human_loop`
- [BACKFILL_IMPORT_AUTOMATION@0.1](./BACKFILL_IMPORT_AUTOMATION@0.1/) — Backfill Import — unit: `record` — runtime: `heavy`
- [EXPORT_BATCH_AUTOMATION@0.1](./EXPORT_BATCH_AUTOMATION@0.1/) — Batch Export — unit: `batch` — runtime: `scheduled`
- [DATA_QUALITY_CHECK_AUTOMATION@0.1](./DATA_QUALITY_CHECK_AUTOMATION@0.1/) — Data Quality Check — unit: `record set` — runtime: `scheduled`
- [WEBHOOK_EVENT_INGEST_AUTOMATION@0.1](./WEBHOOK_EVENT_INGEST_AUTOMATION@0.1/) — Webhook Event Intake — unit: `event` — runtime: `function`
- [ACCESS_REQUEST_AUTOMATION@0.1](./ACCESS_REQUEST_AUTOMATION@0.1/) — Access Request Intake — unit: `request` — runtime: `function`
- [ACCESS_APPROVAL_AUTOMATION@0.1](./ACCESS_APPROVAL_AUTOMATION@0.1/) — Access Approval Routing — unit: `request` — runtime: `human_loop`
- [ACCOUNT_PROVISION_AUTOMATION@0.1](./ACCOUNT_PROVISION_AUTOMATION@0.1/) — Account Provisioning — unit: `account` — runtime: `function`
- [ACCOUNT_DEPROVISION_AUTOMATION@0.1](./ACCOUNT_DEPROVISION_AUTOMATION@0.1/) — Account Deprovisioning — unit: `account` — runtime: `function`
- [CREDENTIAL_EXPIRY_ALERT_AUTOMATION@0.1](./CREDENTIAL_EXPIRY_ALERT_AUTOMATION@0.1/) — Credential Expiry Alert — unit: `credential` — runtime: `scheduled`
- [INTEGRATION_HEALTH_CHECK_AUTOMATION@0.1](./INTEGRATION_HEALTH_CHECK_AUTOMATION@0.1/) — Integration Health Check — unit: `connector` — runtime: `scheduled`

Skeletons are not production-certified implementations.
