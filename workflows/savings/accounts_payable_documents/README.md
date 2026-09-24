# accounts payable documents Savings Workflows

Materialized DESIGN_READY skeletons: **15**

- [INVOICE_EMAIL_INTAKE_AUTOMATION@0.1](./INVOICE_EMAIL_INTAKE_AUTOMATION@0.1/) — Invoice Email Intake — unit: `document` — runtime: `function`
- [DOCUMENT_CLASSIFY_AUTOMATION@0.1](./DOCUMENT_CLASSIFY_AUTOMATION@0.1/) — Document Classification — unit: `document` — runtime: `function`
- [INVOICE_OCR_AUTOMATION@0.1](./INVOICE_OCR_AUTOMATION@0.1/) — Invoice OCR Extraction — unit: `invoice` — runtime: `heavy`
- [RECEIPT_OCR_AUTOMATION@0.1](./RECEIPT_OCR_AUTOMATION@0.1/) — Receipt OCR Extraction — unit: `receipt` — runtime: `heavy`
- [ACCOUNTING_NORMALIZE_AUTOMATION@0.1](./ACCOUNTING_NORMALIZE_AUTOMATION@0.1/) — Accounting Document Normalization — unit: `document` — runtime: `function`
- [INVOICE_ARITHMETIC_VALIDATE_AUTOMATION@0.1](./INVOICE_ARITHMETIC_VALIDATE_AUTOMATION@0.1/) — Invoice Arithmetic Validation — unit: `invoice` — runtime: `function`
- [INVOICE_DUPLICATE_DETECT_AUTOMATION@0.1](./INVOICE_DUPLICATE_DETECT_AUTOMATION@0.1/) — Invoice Duplicate Detection — unit: `invoice` — runtime: `function`
- [VENDOR_VALIDATE_AUTOMATION@0.1](./VENDOR_VALIDATE_AUTOMATION@0.1/) — Vendor Validation — unit: `invoice` — runtime: `function`
- [PO_MATCH_AUTOMATION@0.1](./PO_MATCH_AUTOMATION@0.1/) — PO Match — unit: `invoice` — runtime: `function`
- [THREE_WAY_MATCH_AUTOMATION@0.1](./THREE_WAY_MATCH_AUTOMATION@0.1/) — Three-way Match — unit: `invoice` — runtime: `function`
- [INVOICE_APPROVAL_ROUTE_AUTOMATION@0.1](./INVOICE_APPROVAL_ROUTE_AUTOMATION@0.1/) — Invoice Approval Routing — unit: `invoice` — runtime: `human_loop`
- [ACCOUNTING_EXPORT_AUTOMATION@0.1](./ACCOUNTING_EXPORT_AUTOMATION@0.1/) — Accounting Export — unit: `document` — runtime: `function`
- [DOCUMENT_ARCHIVE_AUTOMATION@0.1](./DOCUMENT_ARCHIVE_AUTOMATION@0.1/) — Document Archive — unit: `document` — runtime: `function`
- [DOCUMENT_EXCEPTION_REVIEW_AUTOMATION@0.1](./DOCUMENT_EXCEPTION_REVIEW_AUTOMATION@0.1/) — Document Exception Review — unit: `exception` — runtime: `human_loop`
- [CPE_VALIDATE_PERU_AUTOMATION@0.1](./CPE_VALIDATE_PERU_AUTOMATION@0.1/) — Peru CPE Validation — unit: `document` — runtime: `function`

Skeletons are not production-certified implementations.
