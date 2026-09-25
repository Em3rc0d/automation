# Runbook — Email Attachment Extraction

Inspect MIME/size policy, attachment IDs, storage path and storage connector health.

Operator invariant: preserve tenant scope and original idempotency semantics when replaying. Verify ProcessRecord and SavingsEvent cardinality after repair. Do not convert exception work into false automated savings.
