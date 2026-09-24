# procurement Savings Workflows

Materialized DESIGN_READY skeletons: **11**

- [PURCHASE_REQUEST_AUTOMATION@0.1](./PURCHASE_REQUEST_AUTOMATION@0.1/) — Purchase Request Intake — unit: `request` — runtime: `function`
- [PURCHASE_REQUEST_VALIDATE_AUTOMATION@0.1](./PURCHASE_REQUEST_VALIDATE_AUTOMATION@0.1/) — Purchase Request Validation — unit: `request` — runtime: `function`
- [PURCHASE_APPROVAL_ROUTE_AUTOMATION@0.1](./PURCHASE_APPROVAL_ROUTE_AUTOMATION@0.1/) — Purchase Approval Routing — unit: `request` — runtime: `human_loop`
- [BUDGET_CHECK_AUTOMATION@0.1](./BUDGET_CHECK_AUTOMATION@0.1/) — Budget Check — unit: `request` — runtime: `function`
- [SUPPLIER_SELECT_AUTOMATION@0.1](./SUPPLIER_SELECT_AUTOMATION@0.1/) — Supplier Selection Support — unit: `request` — runtime: `human_loop`
- [PO_GENERATE_AUTOMATION@0.1](./PO_GENERATE_AUTOMATION@0.1/) — Purchase Order Generation — unit: `purchase order` — runtime: `function`
- [PO_APPROVE_AUTOMATION@0.1](./PO_APPROVE_AUTOMATION@0.1/) — Purchase Order Approval — unit: `purchase order` — runtime: `human_loop`
- [PO_SEND_AUTOMATION@0.1](./PO_SEND_AUTOMATION@0.1/) — Purchase Order Send — unit: `purchase order` — runtime: `function`
- [PO_STATUS_TRACK_AUTOMATION@0.1](./PO_STATUS_TRACK_AUTOMATION@0.1/) — Purchase Order Status Tracking — unit: `purchase order` — runtime: `scheduled`
- [GOODS_RECEIPT_CAPTURE_AUTOMATION@0.1](./GOODS_RECEIPT_CAPTURE_AUTOMATION@0.1/) — Goods Receipt Capture — unit: `receipt` — runtime: `function`
- [SUPPLIER_RISK_ALERT_AUTOMATION@0.1](./SUPPLIER_RISK_ALERT_AUTOMATION@0.1/) — Supplier Risk Alert — unit: `supplier` — runtime: `scheduled`

Skeletons are not production-certified implementations.
