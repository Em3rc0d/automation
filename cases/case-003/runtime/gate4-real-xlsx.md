# CASE-003 Gate 4 — real SAP XLSX snapshot

Gate 4 replaces the synthetic ACTIVE snapshot with a versioned snapshot derived from the three SAP exports while keeping n8n isolated from raw spreadsheet columns.

## Contract

```text
QQVA.XLSX + SCIV.XLSX + FBL1N.XLSX
  -> verify SHA-256
  -> extract rows
  -> normalize explicit source fields
  -> reconcile composite FI key
  -> stage candidate snapshot
  -> validate exact counts/issues/provenance
  -> atomic publish
  -> CASE-003 n8n reservation workflow
```

Raw XLSX files and normalized customer rows are runtime inputs and are not committed to Git. Reproducibility is defined by the source hashes/counts in `gate4-source-manifest.json`, the normalization contract in `../build/normalize-and-reconcile.js`, the canonical schema, and the Gate-4 import/publication schema.

## Source invariants

The certified SOLTRAK source hashes are recorded in `gate4-source-manifest.json`. A different hash is a different source version and must create a different candidate snapshot.

Structural export rows are rejected rather than coerced into canonical records. QQVA resolves repeated Vendor/Company Code rows to the latest source version. SCIV invoices retain pre-FI records. FBL1N rows become `financial_item`, not unconditional payments.

## Reconciliation

Primary FI reconciliation key:

```text
SCIV:
Company Code + FI Document No. + Fiscal Year

FBL1N:
Company Code + Document Number + YEAR(Posting Date)
```

Reference and amount are reconciliation evidence only. They never replace the primary key.

Expected certified counts for this source version:

```text
supplier        2
invoice       531
financial     991
primary links 435
issues        114

SCIV_NO_FI          63
SCIV_FI_UNMATCHED   33
AMOUNT_MISMATCH     10
SOURCE_ROW_REJECTED  8
```

## Publication law

`UPLOAD != PUBLICATION`.

The Gate-4 candidate must satisfy exact expected counts, all three file manifests, zero error-severity issues, and no cross-tenant/cross-snapshot links. Publication is atomic: the old ACTIVE snapshot is marked `superseded` and the candidate becomes `active` in the same database transaction.

Portable SQL:

- `../build/gate4-staged-import.sql`

The canonical snapshot states remain:

`candidate -> active -> superseded` or `candidate -> rejected`.

## n8n proof

n8n reads only the published canonical projection. For the 2026-09-21 certification window, the real snapshot contains one candidate within today through +3 days after excluding `SETTLEMENT_EVIDENCE`:

```text
reference        01-FM01-0096939
FI document      5100028290
canonical due    2026-09-21
due source       FBL1N
payment evidence PAYMENT_DATE_EVIDENCE
```

`PAYMENT_DATE_EVIDENCE` is evidence only; it is not labeled certified paid or unpaid.

A Gate-4 probe uses a fresh rule code so the first n8n execution must reserve the notification and the second execution must return the same durable notification with `reserved=false` and stop before the payload.

## Linux / VPS reproduction

On a new Linux environment:

1. Deploy PostgreSQL/Supabase schemas in order: canonical model, notification idempotency, Gate-3 core, and Gate-4 staged import.
2. Verify source XLSX hashes against `gate4-source-manifest.json`.
3. Extract the three workbooks and feed their rows through the normalization/reconciliation contract.
4. Generate deterministic IDs scoped to tenant + snapshot + source business key.
5. Call `case003_gate4_begin`, stream normalized datasets in bounded chunks through `case003_gate4_ingest`, then call `case003_gate4_publish`.
6. Configure the existing inactive CASE-003 workflow against the same canonical API and run the double-execution idempotency proof.

Secrets and customer row data belong in runtime secret/file storage, never in Git.
