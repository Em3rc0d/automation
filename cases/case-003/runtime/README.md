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

Use this path for the bundled local/VPS PostgreSQL service or any PostgreSQL endpoint reachable from n8n. The dedicated credential is:

```text
id   = case003PostgresV1
name = CASE003 PostgreSQL
type = postgres
```

For the bundled Linux Compose stack, fill the `CASE003_PG_*` values in `.env` (defaults point to the `postgres` service), then:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate2-postgres.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate2.sh
docker compose up -d n8n
```

The configurator creates a pre-backup, hashes all pre-existing credentials and non-CASE003 workflows, imports one dedicated PostgreSQL credential, replaces only the inactive CASE-003 workflow with `n8n/case003-due-date-evaluation-postgres.json`, verifies the invariant set and creates a post-backup. The synthetic fixture is date-relative, so the smoke query remains testable on a fresh install.

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

## Gate 3 — durable reservation and duplicate suppression

Gate 3 moves idempotency into the real n8n execution path. The portable PostgreSQL core is:

```text
../build/gate3-reservation-core.sql
```

For Supabase/PostgREST, apply the wrapper after the core:

```text
../build/gate3-reservation-rpc.sql
```

The runtime-independent core is `case003.reserve_due_candidates(integer,text)`. The bundled Docker Compose PostgreSQL initializes this core automatically; it does not require Supabase roles or PostgREST. It selects ACTIVE-snapshot due candidates and calls `case003.reserve_due_notification(...)` for each candidate. The returned `reserved` flag is the delivery gate.

For Supabase/PostgREST, configure the reservation workflow using the existing Gate-2 RPC credential:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate3-rpc.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate3.sh
docker compose up -d n8n
```

For direct PostgreSQL:

```bash
docker compose stop n8n
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/configure-gate3-postgres.sh
docker compose run --rm --entrypoint sh n8n /opt/case003/scripts/test-gate3.sh
docker compose up -d n8n
```

The smoke test executes the same inactive workflow twice. The first execution must return the expected synthetic invoice with `reserved=true` and allow it into `Build Notification Payload`. The second execution must return the same notification identity with `reserved=false`, produce zero items from `Allow Newly Reserved`, and never reach an outbound channel.

On a shared test database that may already contain the default `due_3d` reservation, set a unique certification rule such as:

```text
CASE003_RULE_CODE=due_3d_gate3_v1
```

Rule codes are part of the durable idempotency key. Production deployments should use a stable business rule code such as `due_3d`; probe codes are only for repeatable certification.

## Gate 4 — real SAP XLSX snapshot

Gate 4 publishes normalized/reconciled QQVA + SCIV + FBL1N data as a canonical snapshot. See `gate4-real-xlsx.md`, `gate4-source-manifest.json`, and `../build/gate4-staged-import.sql`.

The certified source version produces 2 suppliers, 531 invoices, 991 financial items, 435 primary FI links and 114 reconciliation/import issues. The previous synthetic snapshot is superseded only after the real candidate snapshot passes publication checks.

The n8n proof remains inactive and outbound-free. A fresh Gate-4 rule executes twice against the real snapshot: first run `reserved=true`, second run `reserved=false`, with the duplicate blocked before payload construction.

## Trigger split for n8n 2.38.7 UI stability

During Gate 4 UI testing, n8n 2.38.7 intermittently failed manual partial executions with `Cannot read properties of null` while resolving either `Manual Gate Test` or `Daily Schedule` in a workflow where both triggers converged into the same downstream node.

The portable runtime therefore isolates the triggers:

```text
CASE-003 Due Date Evaluation
Manual Trigger -> reservation path

CASE-003 Due Date Schedule
Schedule Trigger -> reservation path
```

Both workflows remain inactive by default, share the same canonical reservation API and idempotency rule, and reuse the same CASE-003 credential. This avoids relying on multi-trigger partial-execution behavior in the editor while preserving scheduled production orchestration.

Artifacts:

- `n8n/case003-due-date-reservation-manual.template.json`
- `n8n/case003-due-date-reservation-schedule.template.json`

## Gate 5 — supplier access control

Gate 5 proves `identity -> verified -> membership -> invoice.read -> ownership -> canonical invoice -> safe response -> audit` against the real Gate-4 snapshot. See `gate5-supplier-query.md`.

The n8n proof is additive, inactive, manual-only and outbound-free. Four synthetic channel identities exercise positive access, wrong supplier scope, missing permission and unknown identity without storing any real supplier phone/email.

## Railway

Railway reuses the existing n8n service and persistent `/home/node/.n8n` volume. It must not create another Railway project or service. The live image implements one-shot startup gates with before/after backups and fail-closed verification. See `railway/README.md` and `evidence/`.

## Current certification boundary

Gate 1 certifies additive inactive installation. Gate 2 certifies an authenticated canonical query. Gate 3 certifies durable reservation and duplicate suppression. Gate 4 certifies the real QQVA/SCIV/FBL1N snapshot and the same n8n reservation path against real SAP-report-derived data while CASE-003 remains inactive.

It does **not** yet certify outbound WhatsApp delivery or production payment semantics. Those remain later gates.
