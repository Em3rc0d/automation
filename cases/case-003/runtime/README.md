# CASE-003 portable runtime

This directory is the reproducible Linux runtime bundle for CASE-003. PostgreSQL/Supabase owns durable business state; n8n is only the orchestration/runtime layer.

## Safety invariants

- CASE-003 imports are additive at Gate 1.
- CASE-003 remains inactive through Gate 2.
- Existing n8n workflows and credentials are never edited or deleted.
- A consistent SQLite backup is created before every startup mutation.
- Gate 2 creates at most one dedicated CASE-003 credential.
- No Gate-2 workflow contains an outbound messaging node.
- Payment evidence `UNKNOWN` is not interpreted as certified unpaid status.

## Runtime targets

The same repository artifacts support:

```text
local Linux ─────┐
brand-new VPS ───┼──> n8n 2.38.7 ──> canonical CASE-003 data
Railway Linux ───┘                       │
                                        ├─ local/external PostgreSQL
                                        └─ Supabase RPC adapter
```

## Layout

- `docker-compose.yml` — reference local/VPS stack with PostgreSQL 16 and n8n 2.38.7.
- `.env.example` — non-secret runtime configuration template.
- `../build/canonical-model.sql` — canonical schema.
- `../build/notification-idempotency.sql` — durable notification reservation ledger.
- `../build/gate2-supabase-rpc.sql` — Supabase Gate-2 RPC adapter.
- `n8n/case003-due-date-evaluation.json` — inactive direct-Postgres workflow source.
- `n8n/case003-due-date-evaluation-supabase-rpc.template.json` — portable Supabase RPC template.
- `scripts/import-workflow.sh` — guarded Gate-1 workflow import.
- `scripts/render-supabase-rpc-workflow.js` — renders public Supabase endpoint/project key into the portable template.
- `scripts/prepare-rpc-credential.js` — creates a temporary n8n credential import file from `CASE003_RPC_TOKEN`.
- `scripts/render-rpc-secret-registration.sh` — renders the SHA-256 secret-registration DML.
- `scripts/test-gate2.sh` — CLI execution smoke test validated from persisted n8n execution data.
- `sql/010-synthetic-smoke.sql` — deterministic, date-relative synthetic fixture.
- `manifest.json` — pinned versions, adapters and invariants.

## Local Linux / brand-new VPS — Gate 1

Prerequisites: Docker Engine and the Docker Compose plugin.

```bash
cd cases/case-003/runtime
cp .env.example .env
# edit .env and replace all placeholder secrets
docker compose up -d postgres n8n
```

For SQLite-backed n8n, stop the server before running CLI imports against the same persistent volume:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/import-workflow.sh
docker compose up -d n8n
```

The Gate-1 verifier refuses the mutation unless the target workflow is absent and the pre-import workflow/credential counts match the configured baseline. Post-import it requires exactly one additional workflow, unchanged credential count, and `active=false`.

## Gate 2A — direct PostgreSQL

Use this path when n8n has a dedicated database login to the CASE-003 PostgreSQL database. Bind a dedicated `postgres` credential only to `case003DueDateEvaluationV1`; do not reuse or modify unrelated credentials. The canonical query is defined in the source workflow and reads `case003.invoice_projection`.

For local Docker Compose, the database hostname is `postgres`, database/user/password come from `.env`, and the synthetic fixture is installed automatically on a fresh PostgreSQL volume.

## Gate 2B — Supabase RPC

Use this path when you do not want the n8n runtime to hold a Supabase database-owner password.

Apply these database artifacts in order:

```text
../build/canonical-model.sql
../build/notification-idempotency.sql
../build/gate2-supabase-rpc.sql
```

Generate a high-entropy `CASE003_RPC_TOKEN`. Register only its SHA-256 in `case003.integration_secret` using `scripts/render-rpc-secret-registration.sh`. The plaintext token belongs only in the runtime secret store and the dedicated n8n credential.

For a Linux local/VPS n8n instance, stop the server before mutating its SQLite volume and run the guarded one-shot configurator:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate2-rpc.sh
```

The configurator backs up SQLite, hashes every existing credential and non-CASE003 workflow, renders the portable RPC workflow, imports exactly one dedicated credential, replaces only the CASE-003 workflow definition, verifies the invariant set, creates a post-backup, and deletes temporary credential/workflow files. With no explicit n8n project ID, the n8n CLI assigns the new credential to the instance owner's personal project.

Detailed Gate-2 procedure: `gate2-connection.md`.

## Gate-2 execution proof

Keep the workflow inactive. With the interactive n8n server still stopped, run the CLI smoke test against the same persistent SQLite volume:

```bash
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate2.sh
```

Then restart the server:

```bash
docker compose up -d n8n
```

The test does not trust CLI log formatting. It checkpoints the latest CASE-003 CLI execution ID, runs the workflow, then reads the newly persisted execution from n8n SQLite, parses n8n's flatted run data and validates the canonical output. The temporary CLI log and execution checkpoint are deleted.

For the synthetic fixture, the validator requires the known smoke invoice, FBL1N due-date precedence, `payment_status_evidence=UNKNOWN`, and a notification key containing the active snapshot ID.

## Railway

Railway reuses the existing n8n service and persistent `/home/node/.n8n` volume. It must not create another Railway project or service. The live image implements one-shot startup gates with before/after backups and fail-closed verification. See `railway/README.md` and `evidence/`.

## Current certification boundary

Gate 1 certifies additive inactive installation. Gate 2 certifies an authenticated read-only canonical query through n8n while preserving all pre-existing credentials/workflows and keeping CASE-003 inactive.

It does **not** yet certify outbound WhatsApp delivery, production payment semantics, or durable notification reservation inside the n8n execution path. Those are later gates.
