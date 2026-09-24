# service operations Savings Workflows

Materialized DESIGN_READY skeletons: **10**

- [WORK_REQUEST_INTAKE_AUTOMATION@0.1](./WORK_REQUEST_INTAKE_AUTOMATION@0.1/) — Work Request Intake — unit: `request` — runtime: `function`
- [WORK_ORDER_CREATE_AUTOMATION@0.1](./WORK_ORDER_CREATE_AUTOMATION@0.1/) — Work Order Creation — unit: `work order` — runtime: `function`
- [WORK_ASSIGN_AUTOMATION@0.1](./WORK_ASSIGN_AUTOMATION@0.1/) — Work Assignment — unit: `work order` — runtime: `function`
- [WORK_STATUS_SYNC_AUTOMATION@0.1](./WORK_STATUS_SYNC_AUTOMATION@0.1/) — Work Status Synchronization — unit: `status change` — runtime: `function`
- [WORK_SLA_WATCHDOG_AUTOMATION@0.1](./WORK_SLA_WATCHDOG_AUTOMATION@0.1/) — Work SLA Watchdog — unit: `work order` — runtime: `scheduled`
- [WORK_CUSTOMER_NOTIFY_AUTOMATION@0.1](./WORK_CUSTOMER_NOTIFY_AUTOMATION@0.1/) — Work Customer Notification — unit: `status change` — runtime: `function`
- [WORK_COMPLETE_AUTOMATION@0.1](./WORK_COMPLETE_AUTOMATION@0.1/) — Work Completion Processing — unit: `work order` — runtime: `function`
- [SERVICE_MAINTENANCE_REMINDER_AUTOMATION@0.1](./SERVICE_MAINTENANCE_REMINDER_AUTOMATION@0.1/) — Maintenance Reminder — unit: `asset/customer` — runtime: `scheduled`
- [TIMESHEET_AGGREGATE_AUTOMATION@0.1](./TIMESHEET_AGGREGATE_AUTOMATION@0.1/) — Timesheet Aggregation — unit: `employee/day` — runtime: `scheduled`
- [PROJECT_STATUS_BRIEF_AUTOMATION@0.1](./PROJECT_STATUS_BRIEF_AUTOMATION@0.1/) — Project Status Brief — unit: `project` — runtime: `scheduled`

Skeletons are not production-certified implementations.
