# W-SAVINGS-P0 Status

Updated: 2026-09-24

```text
Selected workflows          12/12
Reference runtime kit        DONE
Local adapter primitives     3/3
Reference implementations    3/12
Canonical APPROVED_BASELINE  0/12
Paid infrastructure required NO
```

## Implemented references

1. `PAYMENT_REMINDER_AUTOMATION`
   - code: `runtime/savings-p0/src/workflows/payment-reminder.js`
   - package: `workflows/savings/accounts_receivable/PAYMENT_REMINDER_AUTOMATION@0.1/`

2. `APPOINTMENT_REMINDER_AUTOMATION`
   - code: `runtime/savings-p0/src/workflows/appointment-reminder.js`
   - package: `workflows/savings/appointments/APPOINTMENT_REMINDER_AUTOMATION@0.1/`

3. `LEAD_FOLLOWUP_AUTOMATION`
   - code: `runtime/savings-p0/src/workflows/lead-followup.js`
   - package: `workflows/savings/sales_leads/LEAD_FOLLOWUP_AUTOMATION@0.1/`

Shared evidence:
- runtime: `runtime/savings-p0/src/`
- tests: `runtime/savings-p0/test/`
- demos: `runtime/savings-p0/demo/`
- CI: `.github/workflows/savings-p0-validation.yml`

## Important boundary

Passing W-SAVINGS-P0 CI proves the zero-dependency reference implementation on Node. It does not inherit F1 `n8n-base-js-v1` certification and does not silently promote the workflow to the quarry's TESTED or APPROVED stages.
