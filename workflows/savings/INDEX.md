# Materialized Savings Workflow Skeleton Library

Generated from `workflows/SAVINGS-WORKFLOW-REGISTRY.json`.

- Workflow skeletons: **233**
- Domains: **21**
- Package files per workflow: **12**
- Certification state: **DESIGN_READY**
- Production-ready packages created by materialization: **0**

## Domains

- [sales_leads](./sales_leads/) — 11 workflows
- [appointments](./appointments/) — 10 workflows
- [quotes_contracts](./quotes_contracts/) — 16 workflows
- [accounts_receivable](./accounts_receivable/) — 9 workflows
- [supplier_self_service](./supplier_self_service/) — 9 workflows
- [accounts_payable_documents](./accounts_payable_documents/) — 15 workflows
- [expenses](./expenses/) — 9 workflows
- [procurement](./procurement/) — 11 workflows
- [orders_inventory](./orders_inventory/) — 15 workflows
- [support](./support/) — 13 workflows
- [client_onboarding](./client_onboarding/) — 11 workflows
- [hr_admin](./hr_admin/) — 14 workflows
- [inbox_messaging](./inbox_messaging/) — 10 workflows
- [documents_knowledge](./documents_knowledge/) — 11 workflows
- [feedback_retention](./feedback_retention/) — 9 workflows
- [reporting](./reporting/) — 9 workflows
- [data_sync_it](./data_sync_it/) — 16 workflows
- [service_operations](./service_operations/) — 10 workflows
- [education](./education/) — 10 workflows
- [workshop_vehicle](./workshop_vehicle/) — 7 workflows
- [marketing_admin](./marketing_admin/) — 8 workflows

## Package contract

```text
<KEY>@<version>/
├── manifest.yaml
├── README.md
├── config.schema.json
├── contracts/{input.schema.json,output.schema.json}
├── fixtures/{happy-path.json,duplicate.json,provider-error.json}
├── tests/TEST-PLAN.md
├── savings/BASELINE.md
├── implementation/flow.plan.yaml
└── runbook/RUNBOOK.md
```

The library is broad at the **solution skeleton** layer while implementation certification remains selective.
