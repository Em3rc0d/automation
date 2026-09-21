# CASE-003 Gate 2 — Railway evidence

Date: 2026-09-21

Scope: connect the existing inactive CASE-003 workflow to the canonical Supabase/PostgreSQL model, without editing any pre-existing credential or any non-CASE003 workflow, and prove one read-only n8n execution. No outbound channel delivery was present.

## Credential discovery

Read-only metadata inspection found four existing credentials:

```text
crypto          Kapso Webhook HMAC
googlePalmApi   CASE002 Gemini API
httpHeaderAuth  CASE002 Control Plane Internal
httpHeaderAuth  KAPSO API
```

No existing credential was type `postgres`. No credential payload was read.

Decision: use a dedicated Supabase RPC adapter rather than repurpose an existing credential.

## Database adapter

Applied the portable Gate-2 RPC model represented by:

`build/gate2-supabase-rpc.sql`

Runtime database objects:

- `case003.integration_secret`: stores only SHA-256 of the integration token.
- `public.case003_due_candidates(integer)`: authenticated `SECURITY DEFINER` read-only projection of due candidates from the ACTIVE canonical snapshot.

The plaintext integration token is not stored in the repository or in the database table.

## n8n binding deployment

Deployment:

`2216976a-a5af-4d06-904c-38c1473ee09d`

Terminal status:

`SUCCESS`

Pre-mutation backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T13-18-41-073Z-pre-case003-gate2`

SHA-256 at creation:

`f456ef7f036499855eb23942546a8c39acc9235ed29bebd2ec2a070e8399d0b1`

Pre-verifier:

```text
PRE PASS workflows=10 credentials=4 targetCredential=absent targetWorkflow=inactive
```

Post-verifier:

```text
POST PASS workflows=10 credentials=5
existingCredentials=unchanged
existingWorkflows=unchanged
CASE003=inactive
boundCredential=case003RpcAuthV1
```

Post-mutation backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T13-18-47-567Z-post-case003-gate2`

SHA-256 at creation:

`975bd79b26468fa7826096a682c497c33fd796d7633f31415bb560749027d551`

The fifth credential is dedicated to CASE-003:

```text
id   = case003RpcAuthV1
name = CASE003 Supabase RPC Token
type = httpHeaderAuth
```

The four credentials that existed before Gate 2 were verified byte-stable at their encrypted `data` hashes.

## Execution proof

Final certified execution deployment:

`5a96b09e-5104-430d-ae83-d58c03e6ea29`

Terminal status:

`SUCCESS`

Pre-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T13-30-01-650Z-pre-case003-gate2-test`

SHA-256:

`a73c4503a44744a095cc14c3edf27b83fb1715aac1e2bdbd6f84688b7844490b`

Execution checkpoint before test:

`latestCliExecutionId=91`

Certified new execution:

`executionId=92`

Verifier result:

```text
PASS executionId=92
rows=1
expectedInvoice=F001-100
dueDate=2026-09-24
source=FBL1N
paymentEvidence=UNKNOWN
```

Post-test backup:

`/home/node/.n8n/backups/snapshot-2026-09-21T13-30-05-659Z-post-case003-gate2-test`

SHA-256:

`234d49d685db3367e37e2910c757775ed3c3eccc0da2d9cf771de51702bb774c`

State remained:

```text
workflows=10
credentials=5
users=1
CASE-003 active=false
```

The result proves n8n traversed its dedicated authenticated RPC adapter and received the synthetic canonical invoice with FBL1N due-date precedence. `paymentEvidence=UNKNOWN` is intentionally preserved and is **not** described as certified unpaid status.

## Gate reset

After the successful one-shot execution, `CASE003_GATE2_TEST_ON_STARTUP` was reset to `false`.

Reset deployment:

`4077908d-73b6-439f-a11a-abb502b1a26a`

Terminal status:

`SUCCESS`

Reset startup backup SHA-256:

`234d49d685db3367e37e2910c757775ed3c3eccc0da2d9cf771de51702bb774c`

Reset startup evidence:

```text
workflows=10
credentials=5
[case002] skipping workflow import; preserving persisted n8n state
[case002] bootstrap complete; starting n8n
```

This confirms the Gate-2 test was one-shot and the persistent post-test state survived restart.

## Harness qualification notes

Two preliminary execution-proof attempts were not accepted as certification because the verifier itself failed: the first depended on CLI logger output being present in redirected stdout; the second wrote a literal escape sequence into its temporary checkpoint. In both cases the one-shot gate was disabled before correction. The final verifier no longer depends on CLI output: it checkpoints and reads n8n's persisted execution data directly.

No WhatsApp or other outbound channel node exists in the Gate-2 workflow.

## Gate-2 certification boundary

Gate 2 certifies:

```text
existing n8n preserved
+ one dedicated CASE-003 credential
+ authenticated read-only canonical query
+ deterministic synthetic result
+ CASE-003 still inactive
+ no channel delivery
```

It does not yet certify production payment semantics, notification reservation inside the n8n path, or outbound WhatsApp delivery.
