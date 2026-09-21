# CASE-003 Gate 5 — supplier access-control evidence

Date: 2026-09-21

Scope: prove verified channel identity, active membership, `invoice.read`, resource ownership, canonical invoice lookup, neutral denial, safe response rendering and audit against the real Gate-4 SAP snapshot. No outbound channel is present.

## Database objects

Portable core:

- `case003.external_user`
- `case003.external_identity`
- `case003.external_membership`
- `case003.external_membership_permission`
- `case003.supplier_query_audit`
- `case003.resolve_supplier_invoice_query(...)`
- `case003.supplier_invoice_query_direct(...)`

Supabase adapters:

- `public.case003_supplier_invoice_query(...)`
- `public.case003_supplier_invoice_query_json(...)`

The public adapters require both the Supabase API key path and the existing independent `x-case003-token` integration credential. The core stores only a SHA-256 channel-subject hash. Gate-5 fixtures use opaque synthetic subjects, not real phone/email data.

## Access fixture

Four cases are exercised against real invoice `01-FM01-0096939`:

```text
gate5-positive
verified identity -> vendor 100800070 / PE10 -> invoice.read
expected FOUND

gate5-wrong-vendor
verified identity -> SYNTH-OTHER / PE10 -> invoice.read
expected NOT_FOUND_OR_NOT_AUTHORIZED

gate5-no-permission
verified identity -> vendor 100800070 / PE10 -> no invoice.read
expected NOT_FOUND_OR_NOT_AUTHORIZED

gate5-unknown
no verified identity
expected AUTH_REQUIRED
```

Denied cases return no invoice/snapshot fields.

## Additive n8n import

Import deployment:

`9ce1f251-ff9f-42ac-9826-bf6f73af2d18`

Terminal status: `SUCCESS`

Pre-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-19-41-856Z-pre-case003-gate5-import`

SHA-256:

`3d68c692a88f12bacef631b2a86ab92d566ae95e21f44d90a4c8ad1c8aac9a29`

Verifier:

```text
PRE PASS workflows=11 credentials=5 target=absent
POST PASS workflows=12 credentials=5 target=inactive existingState=unchanged
```

Post-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-19-44-503Z-post-case003-gate5-import`

SHA-256:

`d22764eac4006ea82d63117c6c94d952b3145464fc61ab8ff0e5ad680abd91fa`

Imported workflow:

`case003SupplierQueryGate5V1` — `CASE-003 Supplier Invoice Query Gate 5`

State: `inactive`

Existing credential count remained 5 and all existing credential payload hashes/workflow hashes were preserved.

## n8n execution proof

Test deployment:

`a790269d-077f-42df-9ffd-831fa2818a77`

Terminal status: `SUCCESS`

Pre-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-21-09-571Z-pre-case003-gate5-test`

SHA-256:

`9ed3a18fd5d839d395736d3ad21f3beebd16c7d0fb79fff33a40bcc1f63de2f7`

Certified execution:

`executionId=128`

Validator:

```text
positive=FOUND
wrongVendor=NEUTRAL
noPermission=NEUTRAL
unknown=AUTH_REQUIRED
responses=4
outbound=disabled
PASS
```

Post-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-21-14-703Z-post-case003-gate5-test`

SHA-256:

`b385c9c331650b2d84d7f2557b7a4ec29aab4cd256288cfcc9e59de4d847b2e1`

## Positive real-SAP result

```text
decision                = FOUND
invoice_reference       = 01-FM01-0096939
company_code            = PE10
FI document             = 5100028290
canonical_due_date      = 2026-09-21
due_date_source         = FBL1N
payment_status_evidence = PAYMENT_DATE_EVIDENCE
snapshot_id             = b1ea19f1-ed7d-54b5-9009-10759dd6126d
```

The response retains `PAYMENT_DATE_EVIDENCE` as evidence and does not infer certified paid/unpaid state.

## Audit evidence

Latest Gate-5 execution produced four audit records:

```text
gate5-positive      FOUND
reason              owned_resource
snapshot/invoice    recorded

gate5-wrong-vendor  NOT_FOUND_OR_NOT_AUTHORIZED
reason              resource_missing_or_not_owned
snapshot/invoice    null

gate5-no-permission NOT_FOUND_OR_NOT_AUTHORIZED
reason              membership_or_permission_missing
snapshot/invoice    null

gate5-unknown       AUTH_REQUIRED
reason              identity_missing_or_unverified
snapshot/invoice    null
```

The outward response is neutral; the more specific reason exists only in the internal audit record.

## Final reset

The one-shot test gate was reset to `false`.

Clean deployment:

`b56682c0-f0e6-47bb-8dfd-f82cd6e1b616`

Terminal status: `SUCCESS`

Startup evidence:

```text
workflows=12
credentials=5
workflow seed import skipped
no Gate-5 one-shot action executed
```

Startup backup SHA-256:

`98446f9bceba23310e9a1dcd1f136d7ca6ae5fd196a03d1634aab69f299326ae`

## Database advisor follow-up

Covering indexes were added for the two Gate-5 user foreign keys. Supabase performance advisor no longer reports unindexed CASE-003 Gate-5 foreign keys.

Supabase security advisor still flags the CASE-003 public `SECURITY DEFINER` RPCs as anonymous-callable. This is an intentional current adapter boundary: the functions additionally require the independent `x-case003-token` before any query/reservation/import action. This warning should be revisited when the channel-auth gateway is promoted beyond the current server-to-server adapter.

## Certification boundary

Gate 5 certifies:

```text
opaque channel identity
 -> verified identity
 -> active membership
 -> invoice.read
 -> resource ownership
 -> ACTIVE real SAP snapshot
 -> safe canonical invoice response
 -> neutral denial on unauthorized scope
 -> audit
```

It does not yet certify OTP/approval onboarding for an unknown real supplier contact or actual WhatsApp message delivery.
