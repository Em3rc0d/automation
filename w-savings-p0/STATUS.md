# W-SAVINGS-P0 Status

Updated: 2026-09-24

```text
Selected workflows          12/12
Reference runtime kit        DONE
Local adapter primitives     3/3
Reference implementations    1/12
Canonical APPROVED_BASELINE  0/12
Paid infrastructure required NO
```

## Implemented reference

`PAYMENT_REMINDER_AUTOMATION`

Evidence path:

- runtime: `runtime/savings-p0/src/`
- workflow: `runtime/savings-p0/src/workflows/payment-reminder.js`
- tests: `runtime/savings-p0/test/`
- demo: `runtime/savings-p0/demo/payment-reminder/`
- workflow package: `workflows/savings/accounts_receivable/PAYMENT_REMINDER_AUTOMATION@0.1/`

## Important boundary

Passing W-SAVINGS-P0 CI proves the zero-dependency reference implementation on Node. It does not inherit F1 `n8n-base-js-v1` certification and does not silently promote the workflow to the quarry's TESTED or APPROVED stages.
