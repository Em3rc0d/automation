# CASE-003 Gate 4 — real SAP XLSX evidence

Date: 2026-09-21

Scope: publish a canonical snapshot derived from the supplied QQVA, SCIV and FBL1N SAP exports and prove the existing inactive CASE-003 n8n workflow operates deterministically against that real snapshot. No outbound messaging node was present.

## Published snapshot

```text
tenant_id   = 30000000-0000-0000-0000-000000000000
snapshot_id = b1ea19f1-ed7d-54b5-9009-10759dd6126d
status      = active
published   = 2026-09-21 16:14:20.064465+00
```

The previous synthetic snapshot is `superseded`.

## Source provenance

```text
QQVA
sha256 = 8ca860081655d68ec73974aa1acc1915d216c165f60c50303f0d6dfacd841db6
source=5 accepted=4 normalized=2 rejected=1

SCIV
sha256 = 3b65aff52742dcd1a10e8ec29169197272e41a45b9dd7ccb001b6222f9f6ff08
source=531 accepted=531 normalized=531 rejected=0

FBL1N
sha256 = 6ffcddde610ef0683f241a47d3ae40bc77bb75023d88600705d55e9899b70390
source=998 accepted=991 normalized=991 rejected=7
```

No raw XLSX customer data is committed to Git. The hashes/counts are recorded in `runtime/gate4-source-manifest.json`.

## Canonical counts

```text
suppliers        2
invoices       531
financial_items 991
primary links   435
issues          114
source files      3
```

Issue distribution:

```text
SCIV_NO_FI           63
SCIV_FI_UNMATCHED    33
AMOUNT_MISMATCH      10
SOURCE_ROW_REJECTED   8
```

## Real due candidate

For 2026-09-21 through +3 days, excluding `SETTLEMENT_EVIDENCE`, the active snapshot returned exactly one candidate:

```text
reference        = 01-FM01-0096939
FI document      = 5100028290
canonical due    = 2026-09-21
due source       = FBL1N
payment evidence = PAYMENT_DATE_EVIDENCE
```

`PAYMENT_DATE_EVIDENCE` remains evidence only and is not certified as paid or unpaid.

## n8n Gate-4 binding

Binding deployment:

`34a19ebe-61e2-450b-b6b5-7e1ba5d306d7`

Status: `SUCCESS`

Pre-bind backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T16-40-09-112Z-pre-case003-gate4-bind`

SHA-256:

`79ef69dd6ac5d38f16f8e91db58b917892734a6a03d4b0daf8cbf85d133bda4c`

Post-bind backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T16-40-11-691Z-post-case003-gate4-bind`

SHA-256:

`feca977cf3eba7985edbd62dc8f86519f9cd47f23dafa0dac9aeb261a14bb288`

Verifier:

```text
PRE PASS workflows=10 credentials=5 CASE003=inactive credential=reused
POST PASS workflows=10 credentials=5 existingState=unchanged CASE003=inactive reservationPath=bound
```

The Gate-4 workflow uses fresh certification rule `due_3d_gate4_v1`, reuses the existing dedicated CASE-003 RPC credential, and contains no outbound channel.

## Real-data double execution

Test deployment:

`0fa9044e-ab15-4892-807e-51b1617913f2`

First execution:

```text
executionId      = 102
invoice          = 01-FM01-0096939
snapshot         = b1ea19f1-ed7d-54b5-9009-10759dd6126d
dueDate          = 2026-09-21
source           = FBL1N
paymentEvidence  = PAYMENT_DATE_EVIDENCE
reserved         = true
notificationId   = 55cafd2e-f201-463a-9bd8-2b8447a618d1
```

Second execution:

```text
executionId      = 103
invoice          = 01-FM01-0096939
snapshot         = b1ea19f1-ed7d-54b5-9009-10759dd6126d
reserved         = false
duplicateBlocked = true
notificationId   = 55cafd2e-f201-463a-9bd8-2b8447a618d1
```

The two n8n executions produced one durable reservation for `due_3d_gate4_v1`.

## Final reset

Sensitive one-shot Gate-4 import bundle variables and the Gate-4 import token were blanked after publication. The persistent CASE-003 RPC credential remains because it is required by the workflow.

Final clean deployment:

`c7c69e58-9674-4c08-9d10-9d2fbdeaf9a8`

Status: `SUCCESS`

Startup state:

```text
workflows=10
credentials=5
workflow seed import skipped
CASE-003 one-shot Gate-4 gates disabled
```

Startup backup SHA-256:

`46ed22069ed0b12b391a890dba26a7fe4ee7e56c649e959819d14061e6cdda1f`

## Certification boundary

Gate 4 certifies:

```text
real SAP XLSX provenance
 -> explicit normalization/reconciliation
 -> published canonical snapshot
 -> real due candidate
 -> n8n reservation
 -> first run reserved=true
 -> second run reserved=false
 -> duplicate stopped before payload
```

It does not certify final bank-payment semantics or supplier-facing WhatsApp delivery.
