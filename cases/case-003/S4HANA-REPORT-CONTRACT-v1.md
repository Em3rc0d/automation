# CASE-003 — S/4HANA Report Contract v1

Status: **G1 EVIDENCE BASELINE**
Evidence date: 2026-09-19

This contract is derived only from the three representative XLSX files supplied for CASE-003. Unknown SAP semantics are intentionally left unknown rather than inferred.

## Evidence set

| Dataset | Workbook | Data rows | Columns | SHA-256 |
|---|---|---:|---:|---|
| vendor master | SOLTRAK QQVA.XLSX | 4 populated vendor/company-code rows (+ trailing export row) | 197 | 8ca860081655d68ec73974aa1acc1915d216c165f60c50303f0d6dfacd841db6 |
| invoice workflow | SOLTRAK SCIV.XLSX | 531 | 39 | 3b65aff52742dcd1a10e8ec29169197272e41a45b9dd7ccb001b6222f9f6ff08 |
| vendor line items | SOLTRAK FBL1N.XLSX | 998 export rows; 991 rows contain a document number | 24 | 6ffcddde610ef0683f241a47d3ae40bc77bb75023d88600705d55e9899b70390 |

The evidence set contains one supplier, Soltrak SA, SAP Vendor `100800070`, company codes PE10/PE18 in QQVA; SCIV and FBL1N evidence is PE10.

## Proven relationships

### Vendor identity: QQVA -> SCIV

QQVA:
- `CoCd`
- `Vendor`
- `Name`
- `Tax code 1`
- `Clerk's internet address`

SCIV:
- `Company Code`
- `Supplier`
- `Vendor Name`

Observed relationship:

```text
QQVA (CoCd=PE10, Vendor=100800070)
  -> SCIV (Company Code=PE10, Supplier=100800070)
```

The supplied QQVA evidence contains:
- Tax code 1: `20511914125`
- Clerk's internet address: `marycruz.delacruz@soltrak.com.pe`

Therefore the evidence supports a tenant-scoped mapping:
`(company_code, SAP vendor) -> RUC/tax code + pre-existing vendor contact`.

This is sufficient to design RUC claim lookup and trusted-contact verification. It does NOT prove that every future vendor row will have these fields populated.

### Invoice workflow -> financial line item: SCIV -> FBL1N

Primary join candidate:

```text
SCIV.Company Code
+ SCIV.FI Document No.
+ SCIV.Fiscal Year

=

FBL1N.Company Code
+ FBL1N.Document Number
+ YEAR(FBL1N.Posting Date)
```

Why fiscal year is required: document numbers repeat across years in the supplied evidence. Joining on FI document number alone produced cross-year collisions.

Observed:
- 468 SCIV rows contain FI Document No. + Fiscal Year.
- all 468 composite SCIV keys are unique.
- 435/468 composite keys match FBL1N.
- 33 do not match the supplied FBL1N export and MUST remain legitimate unmatched records, not parser failures.

Secondary reconciliation key:

```text
SCIV.Company Code + SCIV.Reference Document No.
=
FBL1N.Company Code + FBL1N.Reference
```

Observed:
- 531 SCIV rows contain Reference Document No.
- 500 unique SCIV references.
- 434 unique references are shared with FBL1N.
- 464/531 SCIV rows have a reference present in FBL1N.
- reference is NOT unique and MUST NOT be the sole business key.

Every primary-key match in this evidence also has a reference match. Reference therefore acts as useful reconciliation evidence, not as the canonical join key.

## Dataset roles

### QQVA — SupplierCanonical source

Required source fields for MVP:
- `CoCd` -> companyCode
- `Vendor` -> sapVendorId
- `Name` -> legal/display name
- `Tax code 1` -> taxId/RUC candidate
- `Clerk's internet address` -> trusted verification contact candidate

Useful optional evidence:
- Group
- Search term A
- City / District / Street / House no.
- Cty
- Telephone / Telephone 1
- Pmnt meths
- PayT
- Recon.acct
- Acct w/ vndr

The QQVA export contains multiple rows for the same vendor/company-code because of `Version`. Import MUST deduplicate/resolve versioned source rows; it MUST NOT create multiple SupplierAccount records from those rows.

### SCIV — InvoiceCanonical source

Required fields:
- Company Code
- Supplier
- Reference Document No.
- Document Date
- Receipt Date
- Currency
- Gross inv. amnt
- Due Date for Net Payment

Conditional identifiers:
- FI Document No.
- Fiscal Year
- MM Document No.
- Purchasing Doc.
- Invoice Unique ID
- Workflow ID

Status/evidence fields retained raw:
- Technical Status
- Invoice Status
- Log. payt block
- Parking/Posting Date
- Parking Reason Code Description
- rejection fields

Observed raw values include `Technical Status = STARTED|COMPLETED` and `Invoice Status = A|5` among populated values. No SAP status legend was supplied, therefore CASE-003 MUST NOT invent the business meaning of `A` or `5`. Raw values are preserved until a client/SAP status dictionary is supplied.

### FBL1N — FinancialItemCanonical source

Required fields:
- Company Code
- Document Number
- Document Type
- Reference
- Document Date
- Posting Date
- Net due date
- Amount in doc. curr.
- Document currency

Settlement/payment evidence:
- Payment date
- Clearing date
- Clearing Document
- Payment Method
- Payment Block

Observed document types:
- RN: 728 rows
- ZP: 262 rows
- AB: 1 row

CASE-003 MUST preserve raw document type. It MUST NOT equate every FBL1N row with an invoice.

Among RN rows:
- 685 contain a Clearing Document.
- 566 clearing-document references point to a ZP Document Number present in this same export.
- therefore the export can support settlement reconciliation, but absence of the referenced ZP row MUST NOT be treated as corruption because the supplied export is not proven exhaustive.

## Canonical keys

### Supplier
```text
tenant_id + company_code + sap_vendor_id
```

RUC/taxId is an identification attribute and lookup key, not the internal primary key and not authentication.

### Invoice source identity
Preferred stable source identity when available:
```text
tenant_id + company_code + fi_document_number + fiscal_year
```

For pre-FI/workflow records where FI Document No. is absent, use a separate workflow-source identity based on immutable SCIV identifiers (prefer `Invoice Unique ID`; retain Workflow ID/MM Document No./Reference as evidence). Do NOT manufacture an FI key.

### Financial item
```text
tenant_id + company_code + document_number + fiscal_year
```
where fiscal year is derived from Posting Date for this FBL1N export contract.

### Human-facing invoice reference
`Reference Document No.` / `Reference` is searchable but not unique. Queries returning multiple matches require disambiguation; they MUST NOT silently select one.

## Reconciliation rules

Blocking:
- missing tenant context;
- unsupported workbook/dataset type;
- missing required header set;
- malformed required key components;
- SCIV supplier cannot resolve to imported SupplierCanonical for its company code;
- duplicate canonical key with conflicting payload;
- invalid currency/amount/date representation that prevents canonicalization.

Warning/review:
- SCIV row has no FI Document No. yet;
- SCIV FI key has no FBL1N match;
- reference has multiple candidate financial rows;
- FBL1N clearing document is not present as a ZP row in the same snapshot;
- SCIV gross amount differs from absolute FBL1N document amount;
- raw status/code is not in configured dictionary;
- trusted contact/taxId missing for a supplier;
- large row-count or coverage drift versus previous snapshot.

The supplied evidence contains 10 primary FI matches where SCIV gross amount differs from the absolute FBL1N document amount. Therefore amount equality is explicitly a reconciliation signal, NOT a join requirement.

## Snapshot grouping

The three datasets form one logical AP publication set:

```text
QQVA supplier master
+ SCIV invoice workflow
+ FBL1N financial items
= supplier_ap snapshot
```

A production publication MUST record each component ImportFile and SHA-256. The snapshot may publish only after required component validation and reconciliation pass according to tenant policy.

## Authentication data boundary

The supplied QQVA evidence closes the previously missing conceptual link:

```text
RUC/tax code
 -> SAP Vendor
 -> trusted pre-existing vendor email
```

For the supplied vendor only:
```text
20511914125 -> 100800070 -> marycruz.delacruz@soltrak.com.pe
```

This evidence is sensitive operational data and SHOULD NOT be copied into generic test fixtures. Build fixtures must replace it with synthetic values while preserving structural behavior.

The user may claim a RUC, but the platform must resolve that claim against imported supplier master data and deliver verification only to a pre-existing trusted destination. A destination typed by the claimant is not trusted.

## Known evidence gaps before production pilot

These do not block building the importer, but remain pilot gates:
- SAP/client dictionary for Invoice Status codes (e.g. A, 5);
- confirmation of the intended business meaning of Payment date versus Net due date in this export;
- policy for which QQVA version wins when multiple version rows exist;
- confirmation that `Tax code 1` is the authoritative RUC field for all target vendors;
- confirmation that `Clerk's internet address` is the approved verification destination source;
- expected export scope/frequency so freshness thresholds can be configured.

## G1 conclusion

G1 report evidence is now sufficient to freeze the structural import contract and begin implementation. G1 does NOT certify SAP source completeness, code semantics not present in the files, or the correctness of the human export.
