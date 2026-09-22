# CASE-003 — Supplier Self-Service from SAP S/4HANA Report Snapshots

Status: **G1 REPORT CONTRACT FROZEN — READY FOR IMPORTER BUILD**
Updated: 2026-09-17

## 1. Purpose

Reduce repetitive Accounts Payable supplier inquiries without granting suppliers direct SAP access.

Initial questions:
- did my invoice enter?
- what is its current status?
- is it approved or observed?
- is payment scheduled?
- was it paid?
- when was it paid?
- what payment reference can safely be shown?

The MVP is deliberately hybrid: SAP S/4HANA remains the upstream financial source, while an authorized client user exports an XLSX/CSV report and uploads it to the platform. The platform validates, reconciles, approves and atomically publishes a versioned snapshot used for supplier queries.

## 2. Trust boundaries

```text
SAP S/4HANA
  -> human export [unverifiable extraction boundary]
  -> immutable uploaded file + SHA-256
  -> ImportBatch
  -> parse/normalize
  -> validation
  -> reconciliation
  -> approval
  -> atomic Snapshot
  -> Supplier / Invoice / Payment facts
  -> authorization + resource ownership
  -> supplier-safe response
  -> AuditEvent
```

The platform can prove which uploaded file produced a published answer. It MUST NOT claim that the manually exported file is a complete or exact representation of SAP.

## 3. Channel and enrollment

Known channel identity:
```text
message -> resolve ChannelIdentity -> active Membership -> permissions -> query
```

Unknown channel identity:
```text
message -> claimed RUC -> find tenant-scoped supplier
        -> verify against pre-existing trusted contact
        -> Membership ACTIVE
```

If no trusted contact can verify the claimant:
```text
AccessRequest PENDING -> human APPROVED/REJECTED
                       -> verification
                       -> Membership ACTIVE
```

RUC identifies a candidate supplier. RUC alone NEVER authenticates or authorizes a person.

A person may have multiple memberships. Phone number MUST NOT be modeled as a one-to-one key to RUC.

## 4. Required adapter boundaries

### ChannelAdapter / WhatsApp
Capabilities:
- `messaging.receive`
- `messaging.send`
- webhook verification
- sender/message normalization
- provider message ID preservation
- healthcheck

Business authorization MUST NOT live in the adapter.

### VerificationDeliveryAdapter
Delivers challenges/invitations/decisions. Challenge generation, hashing, expiry, attempts and verification belong to the platform.

### FileImportAdapter
Case-specific source adapter:
- inspect
- parse XLSX/CSV
- normalize according to versioned ImportProfile

It MUST NOT approve or publish.

### ObjectStorage
Stores the immutable original upload under tenant scope and returns a storage reference. Database domain records store references and hashes, not the file bytes.

### Future S4HanaAdapter
Explicitly out of MVP. A later direct SAP adapter must feed the same normalized import/domain contract so that supplier-query semantics do not change.

## 5. Domain entities

Existing platform contracts remain authoritative: AutomationInstance, ApprovalRequest, ConnectorAccount, Incident and AuditEvent.

CASE-003 introduces case-domain records:

```text
SupplierAccount
  id
  tenantId
  normalizedRuc
  displayName
  externalSupplierId?
  status

ChannelIdentity
  id
  tenantId
  userId
  channel
  externalIdentity
  verifiedAt?
  status

SupplierMembership
  id
  tenantId
  userId
  supplierAccountId
  role
  permissions[]
  status
  verificationMethod
  verifiedAt?

AccessRequest
  id
  tenantId
  userId
  requestedSupplierAccountId
  type = new_access | company_change
  status = pending | approved | rejected | expired
  requestedAt
  decidedAt?
  decidedBy?

ImportFile
  id
  tenantId
  storageReference
  originalFilename
  mimeType
  sizeBytes
  sha256
  uploadedBy
  uploadedAt

ImportProfile
  id
  tenantId
  key
  version
  datasetType
  mapping
  validationRules
  status

ImportBatch
  id
  tenantId
  importFileId
  importProfileId
  status
  traceId
  createdAt
  validatedAt?
  reconciledAt?
  approvedAt?
  publishedAt?

Snapshot
  id
  tenantId
  datasetType
  importBatchId
  status = candidate | active | superseded | rejected
  sourceGeneratedAt?
  publishedAt?
  publishedBy?

InvoiceFact / PaymentFact
  tenantId
  snapshotId
  supplierAccountId
  externalBusinessKey
  normalized fields...
```

Uniqueness of supplier RUC is tenant-scoped: `(tenantId, normalizedRuc)`.

## 6. Import state machine

```text
RECEIVED
 -> INSPECTED
 -> PARSED
 -> NORMALIZED
 -> VALIDATED
 -> RECONCILED
 -> AWAITING_APPROVAL
 -> APPROVED
 -> PUBLISHED

Any blocking failure -> REJECTED
Approval denial      -> REJECTED
```

Publication is atomic. A failed candidate publication MUST leave the previous ACTIVE snapshot untouched.

## 7. Enrollment state machine

```text
UNRECOGNIZED
 -> COMPANY_CLAIMED
 -> VERIFICATION_PENDING
 -> VERIFIED
 -> MEMBERSHIP_ACTIVE

No verifiable contact:
VERIFICATION_PENDING -> ACCESS_REQUEST_PENDING
 -> APPROVED -> VERIFICATION_PENDING
 -> REJECTED | EXPIRED

Existing membership company change:
MEMBERSHIP_ACTIVE -> CHANGE_REQUEST_PENDING
 -> APPROVED -> REVERIFICATION -> MEMBERSHIP_ACTIVE
 -> REJECTED -> original membership unchanged
```

## 8. Query authorization chain

Every sensitive query MUST satisfy, in order:

```text
tenant resolved
AND channel identity recognized/verified per policy
AND membership ACTIVE
AND permission allows requested fact
AND requested resource belongs to membership supplier
AND source snapshot ACTIVE
AND data freshness is disclosed
=> customer-safe response
```

Failure at any authorization/ownership boundary returns a neutral denial/no-match response and creates an AuditEvent.

## 9. Invariants

- C3-I01: no published snapshot without successful batch.
- C3-I02: no batch approval without required validations.
- C3-I03: no publication without approval.
- C3-I04: at most one ACTIVE snapshot per tenant + dataset type.
- C3-I05: every financial fact references its source snapshot.
- C3-I06: every snapshot references its import batch.
- C3-I07: every import batch traces to immutable file SHA-256 and ImportProfile version.
- C3-I08: no sensitive financial query without active membership.
- C3-I09: no sensitive financial query without required permission.
- C3-I10: no response when resource ownership does not match the authorized supplier.
- C3-I11: no cross-tenant traversal.
- C3-I12: enrollment, denial, approval, company change and sensitive query produce AuditEvent.
- C3-I13: unknown SAP status is not inferred.
- C3-I14: snapshot data is never represented as real-time SAP data.
- C3-I15: failed publication never partially replaces the active snapshot.
- C3-I16: RUC alone never creates an ACTIVE membership.
- C3-I17: user-supplied new contact destination never becomes trusted merely by being supplied.
- C3-I18: duplicate file/import side effects are idempotent.

## 10. Required evidence

For every supplier answer the platform must be able to trace:
```text
response
 -> query audit event
 -> supplier membership
 -> financial fact
 -> snapshot
 -> import batch
 -> import profile version
 -> import file
 -> SHA-256
```

## 11. Acceptance gates

**G0 Contract gate**: this document + machine-readable invariants validate.

**G1 Report gate — PASSED STRUCTURALLY (2026-09-19)**: representative XLSX evidence received; QQVA/SCIV/FBL1N columns, composite keys, joins and ImportProfile v1 frozen in `cases/case-003/S4HANA-REPORT-CONTRACT-v1.md` and `import-profile.v1.json`. SAP code semantics not present in the files remain explicit pilot gaps.

**G2 Import gate**: good, malformed, duplicate, incomplete and anomalous fixtures pass expected outcomes.

**G3 Security gate**: cross-tenant, wrong-supplier, RUC-only, stale-contact and replay attempts are denied/audited.

**G4 Publication gate**: atomic publish/rollback and one-active-snapshot invariant proven.

**G5 Channel gate**: signed webhook, idempotent receive/send and safe response behavior proven.

**G6 Pilot gate**: end-to-end trace from supplier message to source file evidence demonstrated.

## 12. Non-goals for MVP

- direct SAP S/4HANA API integration;
- real-time SAP claims;
- Telegram;
- bank connector;
- treasury connector unless report evidence proves required payment fields are unavailable;
- external ticketing;
- arbitrary PDF/OCR/LLM report interpretation;
- automatic access based only on RUC.

## 13. Remaining pilot inputs

The representative XLSX evidence required for structural G1 has been received. Before production pilot, the client/SAP owner must confirm the status-code dictionary, QQVA version-resolution policy, authoritative RUC/contact fields, and expected export frequency/freshness. These gaps do not block importer implementation.
