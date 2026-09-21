# CASE-003 Gate 9 — verified identity core evidence

Date: 2026-09-21

Scope: close the Gate-8 `AUTH_REQUIRED` boundary with a durable verification state machine while keeping CASE-002 unchanged and keeping both email and CASE-003 WhatsApp outbound delivery disabled.

## Database build

Applied to the existing Supabase/PostgreSQL control plane:

- `gate9-verification-core.sql`
- `gate9-verification-rpc.sql`
- `gate9-provider-verification-core.sql`
- `gate9-provider-verification-rpc.sql`

Gate 9 added:

```text
verification_challenge
verification_delivery
verification_event
verification_request.requested_invoice_reference
```

Core rules:

```text
RUC/tax ID = identification only
trusted contact proof or explicit operator approval = authentication/authorization proof
raw verification code persisted = false
raw trusted email in delivery ledger = false
code length = 12 hex chars (~48 bits)
challenge TTL = 10 minutes
max attempts = 5
subject issuance limit = 3/hour
supplier/vendor issuance limit = 10/day
```

## Email-code database proof

A synthetic channel subject was tested against the real published supplier snapshot. No real email was sent.

Observed:

```text
prepare_email_verification
 -> VERIFICATION_DELIVERY_REQUIRED

wrong code
 -> INVALID_VERIFICATION_CODE
 -> attempts_remaining=4

correct generated code
 -> VERIFIED

retry owned invoice
 -> FOUND
 -> invoice_reference=01-FM01-0096939
 -> company_code=PE10
 -> fi_document_number=5100028290
 -> due_date_source=FBL1N
 -> payment_status_evidence=PAYMENT_DATE_EVIDENCE
```

The synthetic external user, identity, membership, verification request and smoke audit row were then removed.

Cleanup proof:

```text
request_count=0
user_count=0
membership_count=0
```

## Operator-approval database proof

A second synthetic subject exercised the explicit audited operator approval path.

Observed:

```text
operator_approve_verification
 -> VERIFIED

retry owned invoice
 -> FOUND / 01-FM01-0096939

cleanup
 -> request_count=0
 -> user_count=0
 -> membership_count=0
```

This proves the support/onboarding path without silently auto-binding a tax-ID claim.

## n8n additive import

Import deployment:

`8e69b29b-cbc2-4528-be5c-d7bc384459b2`

Terminal status: `SUCCESS`.

Pre-import state:

```text
workflows=14
credentials=5
source kapsoMessageReceiveV1 active=1
target case003KapsoVerificationGate9V1 absent
```

Pre-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T21-24-18-100Z-pre-case003-gate9-import`

SHA-256:

`256041ed190bfdaf6cadf309c5b3daf079a49ca4766889be5298dd1d16a7d5ad`

Renderer result:

```text
source=kapsoMessageReceiveV1
existing Kapso HMAC credential reused
existing case003RpcAuthV1 reused
```

Post-import verifier:

```text
workflows=15
credentials=5
target=inactive
sourceUnchanged=true
```

Post-import backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T21-24-24-726Z-post-case003-gate9-import`

SHA-256:

`b1adb08306e4014ea8e7d61dfbe34807bcbe5d9c6fe5330688e4bd4e7ed18c19`

Imported workflow:

```text
id   = case003KapsoVerificationGate9V1
name = CASE-003 Kapso Verification Gate 9
path = POST /webhook/case003/adapters/kapso/whatsapp/verification
state = inactive
```

The workflow stores neither successful nor failed execution payloads, reducing persistence of one-time verification codes.

## Kapso provider preparation

Provider-preparation deployment:

`95d20ff4-4ead-4a60-aeb9-fd3eb65510f6`

Terminal status: `SUCCESS`.

Existing CASE-002 webhook remained:

```text
id     = 5ae34fce-3565-4c32-8f91-b207168ab8df
active = true
path   = /webhook/adapters/kapso/whatsapp/messages
```

A separate Gate-9 webhook was created:

```text
id     = c792d89d-ade2-4def-a208-f82c9c7f7458
active = false
path   = /webhook/case003/adapters/kapso/whatsapp/verification
event  = whatsapp.message.received
```

Assertions:

```text
gate9Inactive=true
case002Unchanged=true
credentialPayloadsEdited=false
workflows=15
credentials=5
```

## Current certified boundary

Gate 9 currently certifies:

```text
pending verification request
 -> trusted-contact challenge generation
 -> hashed code storage
 -> attempt/rate limits
 -> valid code or explicit operator approval
 -> verified external identity
 -> active supplier membership
 -> invoice.read
 -> resource ownership
 -> real canonical invoice FOUND
```

It also certifies an inactive, isolated Kapso verification workflow and inactive Kapso webhook prepared without changing CASE-002.

Gate 9 does **not** yet claim that a verification code has been delivered to the real supplier mailbox. Transactional email transport still requires an explicitly configured email connector/credential. CASE-003 WhatsApp outbound remains disabled.

## Final clean state

Both one-shot Gate-9 deployment variables were reset to false.

Final clean deployment:

`9a5550a4-9a85-441a-8aca-ec5dda11b9c5`

Terminal status: `SUCCESS`.

Final startup evidence:

```text
sha256=b1adb08306e4014ea8e7d61dfbe34807bcbe5d9c6fe5330688e4bd4e7ed18c19
workflows=15
credentials=5
users=1
bootstrap complete
```

No Gate-9 import or provider-preparation block ran during the final startup. The Gate-9 n8n workflow and Kapso webhook remain inactive; CASE-002 remains the active live WhatsApp path.
