# CASE-003 on Railway — reuse the existing n8n service

This target reuses an existing Linux n8n service and its persistent volume. It intentionally does **not** create another Railway project or service.

## Gate 1 — additive inactive workflow

Required live image assets:

```text
/opt/case002/case003-due-date-evaluation.json
/opt/case002/verify-case003-import.js
/opt/case002/backup-n8n-state.js
```

One-shot variable:

```text
CASE003_DUE_DATE_IMPORT_ON_STARTUP=true
```

The startup gate performs:

```text
consistent backup
 -> verify baseline and CASE-003 absent
 -> import exactly one workflow
 -> verify workflow count +1
 -> verify credential count unchanged
 -> verify CASE-003 active=false
 -> consistent backup
```

After terminal deployment status `SUCCESS`, immediately reset the variable to `false` and verify the reset deployment also reaches `SUCCESS`.

## Gate 2 — authenticated canonical query

Before choosing a connector, inspect credential metadata only. Do not read secret payloads. If no existing credential is dedicated to CASE-003 PostgreSQL, do not repurpose one.

The certified Railway path uses the Supabase RPC adapter and creates one new credential:

```text
id   = case003RpcAuthV1
name = CASE003 Supabase RPC Token
type = httpHeaderAuth
```

The live startup verifier hashes the encrypted `data` of every pre-existing credential plus the nodes/connections of every non-CASE003 workflow. After the mutation it requires:

```text
workflow count unchanged
credential count +1
all previous credential hashes unchanged
all non-CASE003 workflow hashes unchanged
CASE-003 active=false
CASE-003 RPC node bound to case003RpcAuthV1
```

The plaintext RPC token is supplied only as a temporary Railway secret for credential creation, is encrypted by n8n into credential storage, and is then cleared from the Railway service variable. PostgreSQL stores only its SHA-256 in `case003.integration_secret`.

## Gate-2 execution proof

The workflow remains inactive. A one-shot startup test runs:

```text
backup
 -> checkpoint latest CASE-003 CLI execution ID
 -> n8n execute --id=case003DueDateEvaluationV1
 -> read the newly persisted execution from SQLite
 -> parse n8n flatted run data
 -> validate canonical result
 -> backup
```

The validator does not depend on CLI log formatting and never prints credential payloads. The workflow contains no WhatsApp/channel-send node.

One-shot variable:

```text
CASE003_GATE2_TEST_ON_STARTUP=true
```

After the test deployment reaches terminal `SUCCESS`, reset it to `false` and verify another `SUCCESS`.

## Recovery law

If any gate fails:

1. Disable the one-shot gate before further investigation.
2. Do not delete/edit existing workflows or credentials.
3. Use the immediately preceding consistent backup as the rollback checkpoint.
4. Correct the gate/verifier in the repository first.
5. Retry only after the corrected image reaches `SUCCESS` with the gate disabled.

## Secrets

No database password, Supabase service-role key, n8n encryption key, RPC plaintext token, or n8n credential payload belongs in Git. Portable files contain only schemas, placeholders, IDs and non-secret configuration.
