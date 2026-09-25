# Document Archive

Status: **DESIGN_READY / REFERENCE_IMPLEMENTED / NOT FACTORY-CERTIFIED**

- Key: `DOCUMENT_ARCHIVE_AUTOMATION@0.1`
- Domain: `accounts_payable_documents`
- Runtime: `function`
- Savings unit: `document`
- Runtime profile: `zero-deps-node-v1`

## Human active work reduced

Rename and store the final document automatically.

## Reference behavior

- accept structured document
- derive deterministic tenant archive path
- sanitize path segments
- store idempotently
- record archive ProcessRecord and SavingsEvent

## Executable evidence

- code: `runtime/savings-p0/src/workflows/document-archive.js`
- tests: `runtime/savings-p0/test/document-archive.test.js`
- demo: `runtime/savings-p0/demo/document-archive/run.js --assert`
- CI: `.github/workflows/savings-p0-validation.yml`

This package remains `DESIGN_READY` and `readyForProduction: false` until the runtime is factory-certified and canonical promotion gates are passed.
