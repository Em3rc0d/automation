# expenses Savings Workflows

Materialized DESIGN_READY skeletons: **9**

- [EXPENSE_SUBMIT_AUTOMATION@0.1](./EXPENSE_SUBMIT_AUTOMATION@0.1/) — Expense Submission Intake — unit: `expense` — runtime: `function`
- [EXPENSE_RECEIPT_EXTRACT_AUTOMATION@0.1](./EXPENSE_RECEIPT_EXTRACT_AUTOMATION@0.1/) — Expense Receipt Extraction — unit: `expense` — runtime: `heavy`
- [EXPENSE_POLICY_CHECK_AUTOMATION@0.1](./EXPENSE_POLICY_CHECK_AUTOMATION@0.1/) — Expense Policy Check — unit: `expense` — runtime: `function`
- [EXPENSE_DUPLICATE_CHECK_AUTOMATION@0.1](./EXPENSE_DUPLICATE_CHECK_AUTOMATION@0.1/) — Expense Duplicate Check — unit: `expense` — runtime: `function`
- [EXPENSE_AUTO_APPROVE_AUTOMATION@0.1](./EXPENSE_AUTO_APPROVE_AUTOMATION@0.1/) — Expense Auto-approval — unit: `expense` — runtime: `function`
- [EXPENSE_MANAGER_APPROVAL_AUTOMATION@0.1](./EXPENSE_MANAGER_APPROVAL_AUTOMATION@0.1/) — Expense Manager Approval — unit: `expense` — runtime: `human_loop`
- [EXPENSE_REGISTER_AUTOMATION@0.1](./EXPENSE_REGISTER_AUTOMATION@0.1/) — Expense Registration — unit: `expense` — runtime: `function`
- [EXPENSE_REIMBURSEMENT_STATUS_AUTOMATION@0.1](./EXPENSE_REIMBURSEMENT_STATUS_AUTOMATION@0.1/) — Reimbursement Status Self-service — unit: `query` — runtime: `function`
- [EXPENSE_MONTHLY_REPORT_AUTOMATION@0.1](./EXPENSE_MONTHLY_REPORT_AUTOMATION@0.1/) — Expense Monthly Report — unit: `report` — runtime: `scheduled`

Skeletons are not production-certified implementations.
