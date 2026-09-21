# CASE-003 Gate 2 — n8n to PostgreSQL/Supabase

Goal: prove that the imported inactive CASE-003 workflow can query the canonical model without editing any pre-existing n8n credential and without outbound delivery.

## Adapter decision

Gate 2 supports two Linux-compatible adapters:

1. **Direct PostgreSQL** — use `build/n8n-due-date-workflow.json` with a dedicated `postgres` credential when a database login is available.
2. **Supabase RPC** — use `build/gate2-supabase-rpc.sql` plus the rendered RPC workflow when the runtime should not hold the Supabase database owner password.

The current Railway environment had four credentials and none was type `postgres`, so the Supabase RPC adapter is the non-destructive path. It creates one dedicated fifth credential of type `httpHeaderAuth`; no existing credential is repurposed.

## Supabase RPC security model

`public.case003_due_candidates(integer)` is a `SECURITY DEFINER` function that:

- reads only the ACTIVE canonical snapshot through `case003.invoice_projection`;
- rejects horizons outside 0–30 days;
- excludes rows with `SETTLEMENT_EVIDENCE`;
- requires header `x-case003-token`;
- compares only SHA-256(token) with the hash stored in `case003.integration_secret`;
- stores no plaintext integration token in PostgreSQL.

The Supabase publishable key is project configuration, not the authorization secret. The additional CASE-003 token is kept in n8n credential storage.

## Register the secret hash

Generate a high-entropy token in your platform secret store:

```bash
export CASE003_RPC_TOKEN='<random-secret>'
```

Render the DML statement:

```bash
sh /opt/case003/scripts/render-rpc-secret-registration.sh > /tmp/register-case003-secret.sql
```

Apply that SQL as a privileged database operator, then securely remove the temporary file. Never commit the plaintext token or generated registration SQL.

## n8n credential

Create exactly one credential:

```text
id   = case003RpcAuthV1
name = CASE003 Supabase RPC Token
type = httpHeaderAuth
data.name  = x-case003-token
data.value = <CASE003_RPC_TOKEN>
```

n8n's CLI accepts decrypted credential data and encrypts it before storage. The portable generator is `runtime/scripts/prepare-rpc-credential.js`.

## Workflow rendering

The portable Supabase workflow is a template. Set:

```bash
CASE003_SUPABASE_URL=https://<project-ref>.supabase.co
CASE003_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

Then render:

```bash
node /opt/case003/scripts/render-supabase-rpc-workflow.js
```

The output binds only the CASE-003 RPC node to `case003RpcAuthV1`. The workflow remains inactive and contains no channel-send node.

## Safety sequence

1. Back up n8n SQLite consistently.
2. Verify CASE-003 exists and is inactive.
3. Capture hashes of all existing credentials and all non-CASE003 workflows.
4. Refuse Gate 2 if `case003RpcAuthV1` already exists.
5. Import the dedicated credential.
6. Replace only `case003DueDateEvaluationV1` with the RPC adapter.
7. Verify workflow count is unchanged, credential count is exactly +1, every old credential hash is unchanged, every non-CASE003 workflow hash is unchanged, and CASE-003 remains inactive.
8. Checkpoint the latest CASE-003 CLI execution ID, execute the inactive workflow with the n8n CLI, then validate the newly persisted `execution_entity`/`execution_data` record using n8n's flatted data format. This avoids depending on logger/stdout configuration.
9. Require the synthetic smoke invoice, FBL1N due-date precedence, `payment_status_evidence=UNKNOWN`, and a notification key containing the active snapshot ID.
10. No WhatsApp/channel side effect is permitted during Gate 2.

## Portable Linux one-shot configuration

For a stopped SQLite-backed n8n instance, the repository provides:

```bash
sh /opt/case003/scripts/configure-gate2-rpc.sh
```

This script is fail-closed. It creates a consistent pre-backup, captures hashes for every existing credential and every non-CASE003 workflow, renders the environment-specific RPC workflow from the portable template, imports exactly one dedicated CASE-003 credential, replaces only `case003DueDateEvaluationV1`, verifies the before/after invariants, creates a post-backup, and removes temporary files.

When `n8n import:credentials` is called without `--projectId` or `--userId`, n8n assigns a new credential to the instance owner's personal project. Railway may instead pin an explicit project ID when reproducing an existing multi-workflow production instance.

## Gate-2 pass conditions

```text
workflow count unchanged
credential count old + 1
all old credential encrypted-data hashes unchanged
all non-CASE003 workflows unchanged
CASE-003 inactive
CASE-003 bound only to case003RpcAuthV1
read-only canonical query succeeds
no outbound delivery node
```

Gate 2 does not yet claim that `UNKNOWN` means unpaid, nor does it publish/activate the daily schedule. Payment semantics and durable notification reservation remain later certification gates.
