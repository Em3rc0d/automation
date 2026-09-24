# orders inventory Savings Workflows

Materialized DESIGN_READY skeletons: **15**

- [ORDER_INGEST_AUTOMATION@0.1](./ORDER_INGEST_AUTOMATION@0.1/) — Order Intake — unit: `order` — runtime: `function`
- [ORDER_NORMALIZE_AUTOMATION@0.1](./ORDER_NORMALIZE_AUTOMATION@0.1/) — Order Normalization — unit: `order` — runtime: `function`
- [ORDER_CUSTOMER_UPSERT_AUTOMATION@0.1](./ORDER_CUSTOMER_UPSERT_AUTOMATION@0.1/) — Order Customer Upsert — unit: `order` — runtime: `function`
- [INVENTORY_CHECK_AUTOMATION@0.1](./INVENTORY_CHECK_AUTOMATION@0.1/) — Inventory Check — unit: `order` — runtime: `function`
- [INVENTORY_RESERVE_AUTOMATION@0.1](./INVENTORY_RESERVE_AUTOMATION@0.1/) — Inventory Reservation — unit: `order` — runtime: `function`
- [INVENTORY_SYNC_AUTOMATION@0.1](./INVENTORY_SYNC_AUTOMATION@0.1/) — Inventory Synchronization — unit: `inventory movement` — runtime: `function`
- [LOW_STOCK_ALERT_AUTOMATION@0.1](./LOW_STOCK_ALERT_AUTOMATION@0.1/) — Low Stock Alert — unit: `SKU` — runtime: `scheduled`
- [REORDER_RECOMMEND_AUTOMATION@0.1](./REORDER_RECOMMEND_AUTOMATION@0.1/) — Reorder Recommendation — unit: `SKU` — runtime: `scheduled`
- [FULFILLMENT_ROUTE_AUTOMATION@0.1](./FULFILLMENT_ROUTE_AUTOMATION@0.1/) — Fulfillment Routing — unit: `order` — runtime: `function`
- [ORDER_STATUS_NOTIFY_AUTOMATION@0.1](./ORDER_STATUS_NOTIFY_AUTOMATION@0.1/) — Order Status Notification — unit: `status change` — runtime: `function`
- [SHIPPING_TRACK_SYNC_AUTOMATION@0.1](./SHIPPING_TRACK_SYNC_AUTOMATION@0.1/) — Shipping Tracking Sync — unit: `shipment` — runtime: `scheduled`
- [RETURN_REQUEST_AUTOMATION@0.1](./RETURN_REQUEST_AUTOMATION@0.1/) — Return Request Intake — unit: `return` — runtime: `function`
- [REFUND_APPROVAL_AUTOMATION@0.1](./REFUND_APPROVAL_AUTOMATION@0.1/) — Refund Approval — unit: `refund` — runtime: `human_loop`
- [POST_PURCHASE_FOLLOWUP_AUTOMATION@0.1](./POST_PURCHASE_FOLLOWUP_AUTOMATION@0.1/) — Post-purchase Follow-up — unit: `order` — runtime: `scheduled`
- [ABANDONED_CART_FOLLOWUP_AUTOMATION@0.1](./ABANDONED_CART_FOLLOWUP_AUTOMATION@0.1/) — Abandoned Cart Follow-up — unit: `cart` — runtime: `scheduled`

Skeletons are not production-certified implementations.
