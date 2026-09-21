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

## Real-provider arm

Gate 9 was armed for the next real WhatsApp verification-init proof.

Arm deployment: `77a709cd-af2c-4d37-8dd1-be8c8a35740f` — `SUCCESS`.

Pre-arm backup: `/home/node/.n8n/backups/snapshot-2026-09-21T21-32-22-237Z-pre-case003-gate9-arm`

Pre-arm SHA-256: `b1adb08306e4014ea8e7d61dfbe34807bcbe5d9c6fe5330688e4bd4e7ed18c19`

Arm assertions:

```text
gate9WebhookActive=true
gate9WorkflowActive=true
case002Unchanged=true
whatsappOutboundDisabled=true
emailOutboundDisabled=true
```

Post-arm backup: `/home/node/.n8n/backups/snapshot-2026-09-21T21-32-31-465Z-post-case003-gate9-arm`

Post-arm SHA-256: `bf53882c442e8bac8756e2e6b666f157221435ab4fda143e99d9421e2ebae383`

The one-shot arm variable was reset to false without triggering another deployment. The running Gate-9 path remains armed only for the explicit real test; future unrelated deployments will not re-run the arm mutation automatically.


## First real-provider attempt — defect found and repaired

The user sent the real WhatsApp message:

```text
RUC 20511914125 FACTURA 01-FM01-0096939
```

CASE-002 continued normally and its existing webhook returned HTTP 200 at approximately `2026-09-21T21:44:43Z`.

The isolated Gate-9 webhook also received the provider delivery, but the first real execution exposed a workflow-source defect before any database RPC was called:

```text
POST /webhook/case003/adapters/kapso/whatsapp/verification
21:44:51Z -> HTTP 500
21:45:02Z -> HTTP 500
21:45:42Z -> HTTP 500

Normalize Kapso Message
SyntaxError: Invalid or unexpected token
```

The malformed source contained a literal escaped newline inside the Code-node program. The same node also referenced `verificationCode` before defining it. Because execution failed in the normalization node, no new `channel_message`, `verification_request`, or `verification_challenge` row was created from this real attempt.

The source was repaired in both the live Railway source branch and the canonical CASE-003 branch. The parser now:

- contains real JavaScript newlines rather than literal `\\n` tokens,
- explicitly extracts a 12-character hexadecimal code from `CODIGO/CÓDIGO/CODE/OTP` or a bare 12-character code,
- defines `verificationCode` before it is used,
- passes syntax validation for every Code node before repository update.

Commits:

```text
live runtime parser fix  = 3692a37b38a34c5158fb7f41b8dd10bd14be4ecd
canonical parser fix     = 530b578e30889dc1ed14abe35c5f67008bfdb34a
guarded replacement fix  = 4525de492dcd517a3c9f084827c962104264896e
```

The existing broken Gate-9 workflow was first disarmed. A guarded replacement path was then added to the verifier: replacing an existing Gate-9 workflow is allowed only while that target is inactive; all other workflows and all credential payload hashes remain immutable.

Certified hotfix replacement:

```text
deployment = 612b059f-26ef-468f-b006-1143d99f26dd
status     = SUCCESS
PRE        = target=replace-inactive
POST       = workflows=15 credentials=5 target=inactive sourceUnchanged=true
backup     = sha256:88ae515a6bc265f86b749a355ed7fe3ee2bdac927134a0729a9e17b1477f4290
```

Gate 9 was then armed again:

```text
deployment = be7c8c99-e35a-47cc-b267-1c020ab8e8a6
status     = SUCCESS

gate9WebhookActive=true
gate9WorkflowActive=true
case002Unchanged=true
whatsappOutboundDisabled=true
emailOutboundDisabled=true

post-arm backup sha256 =
23e9423f443e286677a94311b9c0587eeddec099bc0762cbb6bc9298aabfcaf4
```

The one-shot arm/import/disarm variables were reset to `false` without redeploying, so the currently running Gate-9 path stays armed for the explicit retry while unrelated future deployments will not repeat the mutation automatically.

The real-provider verification-init proof therefore remains **pending one user resend** after this hotfix; it is not falsely marked as certified.


## Second real-provider attempt — unresolved runtime endpoint found and repaired

The user resent the real WhatsApp request after the parser hotfix. CASE-002 again received the event successfully:

```text
2026-09-21T22:12:11Z
POST /webhook/adapters/kapso/whatsapp/messages
HTTP 200
```

Gate 9 also received the event, proving the HMAC/provider path remained live, but failed before the database RPC:

```text
2026-09-21T22:12:23Z
POST /webhook/case003/adapters/kapso/whatsapp/verification
HTTP 500

Invalid URL:
__CASE003_SUPABASE_URL__/rest/v1/rpc/case003_provider_channel_message_json
```

Kapso retried the Gate-9 delivery and received the same failure. No new CASE-003 `channel_message`, `verification_request`, `verification_challenge`, or `verification_event` row was created by this attempt, so no identity/access state was partially committed.

Root cause: the Gate-9 template intentionally used portable Supabase placeholders, but the Railway preparation step bound credentials without rendering `CASE003_SUPABASE_URL` and `CASE003_SUPABASE_PUBLISHABLE_KEY`.

Repair:

```text
runtime renderer commit          = b404c5a47e2a2cec3cc8dab0da1a51fc3e0d5148
runtime verifier commit          = 8ec7e7704c3c23191f895b1a07e8fa3758796352
portable canonical renderer      = ce7783c54206d9c5b23bb4f819bca77af5f16ca5
```

The renderer now resolves the Supabase URL/key only from runtime environment configuration, refuses missing/invalid values, refuses unresolved `__CASE003_*` placeholders, and does not log the key. The import verifier also fails closed if either RPC URL is not HTTPS or a template placeholder remains.

Controlled replacement sequence:

```text
disarm deployment = b4a461b7-8991-4c34-9cfe-d72021c622b8
result            = gate9WebhookActive=false, gate9WorkflowActive=false
CASE-002           = unchanged

replacement deployment = 2ad10104-21bc-4da4-9749-28bdd141f8c3
status                 = SUCCESS
PRE                    = target=replace-inactive
POST                   = workflows=15 credentials=5 target=inactive sourceUnchanged=true
post-import backup     = sha256:68fc665084c0b2b844e62a0601793f5048e68b2de72bdf54ddb0e982d417803b

re-arm deployment = 563dadc7-d2a7-49b9-93da-9c2d9733f43c
status            = SUCCESS
gate9WebhookActive=true
gate9WorkflowActive=true
case002Unchanged=true
whatsappOutboundDisabled=true
emailOutboundDisabled=true
post-arm backup   = sha256:4599d6e532a5254b9930abc7051d0eec5d2ae54cd6740a4fb7951fda1a3028d4
```

All Gate-9 one-shot variables were reset to `false` without another deployment. The running Gate-9 workflow/webhook remains armed for the next explicit real-provider attempt.

The real verification-init proof remains pending; neither failed attempt is counted as certification.
