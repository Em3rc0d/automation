# documents knowledge Savings Workflows

Materialized DESIGN_READY skeletons: **11**

- [FILE_INGEST_AUTOMATION@0.1](./FILE_INGEST_AUTOMATION@0.1/) — File Intake — unit: `file` — runtime: `function`
- [FILE_MIME_VALIDATE_AUTOMATION@0.1](./FILE_MIME_VALIDATE_AUTOMATION@0.1/) — File Type Validation — unit: `file` — runtime: `function`
- [OCR_EXTRACT_AUTOMATION@0.1](./OCR_EXTRACT_AUTOMATION@0.1/) — OCR Extraction — unit: `document` — runtime: `heavy`
- [STRUCTURED_FIELD_EXTRACT_AUTOMATION@0.1](./STRUCTURED_FIELD_EXTRACT_AUTOMATION@0.1/) — Structured Field Extraction — unit: `document` — runtime: `heavy`
- [DOCUMENT_RENAME_AUTOMATION@0.1](./DOCUMENT_RENAME_AUTOMATION@0.1/) — Document Renaming — unit: `file` — runtime: `function`
- [DOCUMENT_ROUTE_FOLDER_AUTOMATION@0.1](./DOCUMENT_ROUTE_FOLDER_AUTOMATION@0.1/) — Document Folder Routing — unit: `document` — runtime: `function`
- [DOCUMENT_DEADLINE_EXTRACT_AUTOMATION@0.1](./DOCUMENT_DEADLINE_EXTRACT_AUTOMATION@0.1/) — Document Deadline Extraction — unit: `document` — runtime: `heavy`
- [DOCUMENT_EXPIRY_ALERT_AUTOMATION@0.1](./DOCUMENT_EXPIRY_ALERT_AUTOMATION@0.1/) — Document Expiry Alert — unit: `document` — runtime: `scheduled`
- [DOCUMENT_INDEX_AUTOMATION@0.1](./DOCUMENT_INDEX_AUTOMATION@0.1/) — Document Indexing — unit: `document` — runtime: `function`
- [DOCUMENT_TO_RAG_AUTOMATION@0.1](./DOCUMENT_TO_RAG_AUTOMATION@0.1/) — Knowledge Ingestion — unit: `document` — runtime: `heavy`
- [RAG_ANSWER_AUTOMATION@0.1](./RAG_ANSWER_AUTOMATION@0.1/) — Knowledge Q&A with Evidence — unit: `query` — runtime: `function`

Skeletons are not production-certified implementations.
