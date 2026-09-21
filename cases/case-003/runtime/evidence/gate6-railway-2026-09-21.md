# CASE-003 Gate 6 — authenticated channel-ingress evidence

Date: 2026-09-21

Scope: prove an authenticated provider-neutral HTTP ingress in the existing n8n runtime, replay protection, verified identity routing, safe verification initiation, and restoration to an inactive/outbound-disabled state. This gate does not claim a live Meta/Kapso webhook or outbound WhatsApp delivery.

## Database core proof

Gate 6 extends the Gate-5 trust chain with:

```text
authenticated channel envelope
 -> provider_message_id replay gate
 -> channel identity
 -> Gate-5 authorization/ownership
 -> canonical invoice response
 OR
 -> verification initiation for unknown identity
```

Database-side test results:

```text
verified synthetic WhatsApp subject + real owned invoice
 -> FOUND
 -> invoice_reference=01-FM01-0096939
 -> snapshot=b1ea19f1-ed7d-54b5-9009-10759dd6126d
 -> channel_delivery=disabled

same provider_message_id
 -> DUPLICATE
 -> duplicate_ignored

unknown subject, no tax-id claim
 -> AUTH_REQUIRED
 -> next_action=provide_tax_id
 -> no invoice fields

unknown subject + source tax-id claim
 -> VERIFICATION_REQUIRED
 -> next_action=verify_trusted_contact
 -> verification_request created
 -> trusted contact masked
 -> delivery_status=disabled
 -> no external_identity or membership auto-created
```

The verification candidate logic groups multiple active company-code rows for the same SAP vendor as one supplier relationship only when there is exactly one vendor and one pre-existing trusted contact.

Example verification request created during the proof:

```text
status                 = pending
delivery_status        = disabled
candidate_vendor_id    = 100800070
company_code_scope     = null
trusted_contact_masked = m***************z@soltrak.com.pe
```

The null company-code scope is expected because this real source version contains the same vendor relationship in multiple company codes.

## Additive n8n import

Import deployment:

`849f2cac-2fd5-4776-b333-cc65910d38f4`

Terminal status: `SUCCESS`

Pre-import evidence:

```text
workflows=12
credentials=5
target=absent
```

Pre-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-44-01-178Z-pre-case003-gate6-import`

SHA-256:

`5e87983008573942518c00e9e11050b48c80a5e43f7668d575549d904c677ff1`

Post-import verifier:

```text
workflows=13
credentials=5
target=inactive
existingState=unchanged
```

Post-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-44-03-778Z-post-case003-gate6-import`

SHA-256:

`63fd551b81a55be56739233ab0cf5e1e3e9bb095f3fc2fe5eff5db441bdb018d`

Imported workflow:

```text
id   = case003SupplierChannelGate6V1
name = CASE-003 Supplier Channel Gate 6
path = POST /webhook/case003/supplier-channel
```

No existing credential was created, edited or deleted.

## Real HTTP ingress proof

HTTP-proof deployment:

`bdbc1d0e-19f0-4541-af54-12de8717406f`

Terminal status: `SUCCESS`

The proof temporarily activated only Gate 6, started n8n's HTTP runtime, sent authenticated POST requests through the webhook, then restored Gate 6 to inactive.

Pre-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-56-36-843Z-pre-case003-gate6-http-test`

SHA-256:

`d2936edc2b20494ba206d86eeb914ec6facf4c9fc296472d96e02bd9b69103f8`

Runtime result:

```text
positive=FOUND
duplicate=DUPLICATE
unknown=AUTH_REQUIRED
verification=DB_CORE_ONLY
autoBind=false
outbound=disabled
PASS
```

`verification=DB_CORE_ONLY` means the HTTP deployment intentionally did not inject real source tax-id data into Railway environment variables. The RUC-to-verification-request branch had already been executed against the same production-like database core and produced the masked pending request documented above.

Final assertion during the HTTP proof:

```text
Gate-6 workflow inactive=true
```

Post-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T17-56-52-921Z-post-case003-gate6-http-test`

SHA-256:

`6db82edcd1f6996c096f736be741d47f7d5aea33a584b1edac9bc8add85bc6ba`

Post-test state:

```text
workflows=13
credentials=5
users=1
```

## Final reset

Both Gate-6 one-shot variables were reset to false.

Clean deployment:

`f7aa1a6a-3ede-49fe-95a8-69228d73f3ef`

Terminal status: `SUCCESS`

Clean startup evidence:

```text
sha256=6db82edcd1f6996c096f736be741d47f7d5aea33a584b1edac9bc8add85bc6ba
workflows=13
credentials=5
workflow seed import skipped
bootstrap complete
```

No Gate-6 mutation/test block executed on the final startup.

## Fail-closed engineering evidence

During Gate-6 construction two transient test deployments failed without altering protected state:

- a repeated additive import was rejected because the Gate-6 workflow already existed;
- an early HTTP harness expected an environment token/tax-id value that was intentionally not present.

The import verifier stopped before duplicate mutation, and the HTTP harness cleanup restored Gate 6 to inactive. The final harness reads the existing encrypted n8n CASE-003 credential through a temporary decrypted export file, deletes that file immediately, never logs the secret, and treats the real tax-id HTTP probe as optional.

## Security/advisor follow-up

Supabase performance advisor reports no unindexed foreign-key finding for CASE-003 Gate-6 tables.

The public Supabase RPC adapter remains an intentional `SECURITY DEFINER` PostgREST surface callable through the anon API role, but it additionally requires the independent `x-case003-token` before executing the private Gate-6 core. This warning remains part of the current server-to-server adapter boundary.

## Certification boundary

Gate 6 certifies:

```text
authenticated provider-neutral HTTP ingress
 -> normalized channel envelope
 -> replay protection
 -> verified identity routing
 -> Gate-5 permission + ownership
 -> real SAP canonical response
 OR
 -> safe verification initiation
 -> no RUC auto-bind
 -> outbound disabled
 -> audit/state
```

Gate 6 does not yet certify a real Kapso/Meta event entering CASE-003, delivery of an OTP/verification message, approval of an unknown supplier user, or supplier-facing WhatsApp outbound delivery.
