# Email Attachment Extraction

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `EMAIL_ATTACHMENT_EXTRACT_AUTOMATION@0.1`
- Domain: `inbox_messaging`
- Runtime: `function`
- Savings unit: `attachment`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Download and attach relevant files to the right process.

## Reference behavior

- inspect structured attachment list
- filter by MIME/size policy
- store each eligible attachment idempotently
- record one unit per stored attachment
- report skipped attachments without false savings

## Executable evidence

- code: `runtime/savings-p0/src/workflows/email-attachment-extract.js`
- tests: `runtime/savings-p0/test/email-attachment-extract.test.js`
- demo: `runtime/savings-p0/demo/email-attachment-extract/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
