# Low Stock Alert

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `LOW_STOCK_ALERT_AUTOMATION@0.1`
- Domain: `orders_inventory`
- Runtime: `scheduled`
- Savings unit: `SKU`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Review stock levels and notify only below configured thresholds.

## Reference behavior

- scan tenant inventory rows
- compare onHand to reorderPoint
- ignore inactive/sufficient stock
- alert once per stock/threshold fingerprint
- missing alert contact becomes exception time

## Executable evidence

- code: `runtime/savings-p0/src/workflows/low-stock-alert.js`
- tests: `runtime/savings-p0/test/low-stock-alert.test.js`
- demo: `runtime/savings-p0/demo/low-stock-alert/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
