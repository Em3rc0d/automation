# Bootstrap from zero

This runbook rebuilds CASE-003 from a clean environment.

## Phase 0 — freeze inputs

Record:

```text
repository branch
repository commit SHA
n8n image tag
target hostname
target platform
CASE-003 database target
mail transport choice
provider/WhatsApp account
```

Do not begin with a moving `main` checkout or `latest` image.

## Phase 1 — infrastructure

### Railway

Create:

```text
n8n service
n8n PostgreSQL service (greenfield recommendation)
persistent volume if filesystem data is used
public domain
```

Then follow `RAILWAY.md`.

### VPS / VM

Install Docker + Compose, configure DNS and use `LINUX-DOCKER.md`.

## Phase 2 — secret escrow

Before importing workflows, provision:

```text
N8N_ENCRYPTION_KEY
Supabase access/recovery credentials
CASE003 RPC token
Kapso HMAC secret
Kapso API token
mail credential/API key when used
```

The values stay outside Git.

## Phase 3 — CASE-003 database

1. create/link the target Supabase project;
2. back it up if it is not empty;
3. apply schema/migrations in manifest order;
4. load the SAP snapshot through the existing Gate-4 import path;
5. verify source provenance and counts;
6. create provider/channel binding;
7. install Gate-9 verification functions;
8. install Gate-10 adapter schema only if that transport/test mode is required;
9. run database smoke tests;
10. review Supabase Security Advisor.

Do not create synthetic verified identities in production.

## Phase 4 — start n8n

Start the empty n8n runtime first.

Verify:

```text
version matches pinned version
owner/admin login works
database persists across restart
N8N_ENCRYPTION_KEY remains stable
public HTTPS works
WEBHOOK_URL is correct
```

## Phase 5 — create credentials

Create the required credentials manually or through a controlled bootstrap that never logs secret payloads.

Verify metadata only:

```text
name
type
ID resolved by target instance
```

Do not copy credential IDs from another n8n instance.

## Phase 6 — render/import workflows

Use the repository templates/renderers.

Rules:

- render environment-specific URLs/credential IDs at deploy time;
- keep source templates secret-free;
- import inactive unless the gate explicitly requires activation;
- hash/compare unrelated workflows before/after mutation;
- back up n8n immediately before import/publish.

## Phase 7 — smoke before provider cutover

Run:

```text
invalid auth/signature negative test
provider binding negative test
known synthetic/local database smoke where allowed
invoice ownership negative test
replay/duplicate test
```

No outbound WhatsApp/email should be enabled simply to test database logic.

## Phase 8 — provider cutover

1. back up again;
2. set provider webhook to the new public endpoint;
3. arm the exact workflow;
4. send one real low-risk message;
5. verify HTTP result and durable CASE-003 event;
6. confirm no invoice disclosure before verification;
7. only then proceed to Gate-10 identity proof.

## Phase 9 — Gate 10

Select one:

```text
SMTP reachable -> n8n Send Email
SMTP blocked   -> HTTPS mail API
SMTP mandatory on blocked host -> external mail worker
```

Do not enable a delivery adapter without a real controlled mailbox test.

## Phase 10 — evidence

Create a deployment evidence file containing:

```text
platform
commit SHA
image/version
database target
workflow count
credential metadata count
provider message ID
safe trace/request IDs
decisions/results
backup identifier
known gaps
```

Never include secret values, raw OTP or full trusted-contact email.
