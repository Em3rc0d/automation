# Environment contract

This file defines configuration names, ownership and persistence. It intentionally contains no live value.

## n8n runtime

| Variable | Required | Secret | Purpose |
|---|---:|---:|---|
| `N8N_VERSION` | yes in deployment config | no | pinned image tag; current reference `2.38.7` |
| `N8N_ENCRYPTION_KEY` | yes | yes | encrypts n8n credentials; must survive restores/moves |
| `N8N_HOST` | public runtime | no | public n8n hostname |
| `N8N_PORT` | yes | no | n8n listen port, normally 5678 |
| `N8N_PROTOCOL` | public runtime | no | normally `https` behind TLS |
| `WEBHOOK_URL` | webhook runtime | no | externally reachable webhook base URL |
| `N8N_EDITOR_BASE_URL` | public editor | no | public editor URL |
| `N8N_PROXY_HOPS` | reverse proxy | no | number of trusted proxy hops; typically 1 with one reverse proxy |
| `GENERIC_TIMEZONE` | yes | no | `America/Lima` |
| `TZ` | yes | no | `America/Lima` |
| `EXECUTIONS_DATA_PRUNE` | recommended | no | execution retention control |
| `EXECUTIONS_DATA_MAX_AGE` | recommended | no | hours to retain execution data |

## n8n PostgreSQL

Use these only for the **n8n internal database**:

```text
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST
DB_POSTGRESDB_PORT
DB_POSTGRESDB_DATABASE
DB_POSTGRESDB_USER
DB_POSTGRESDB_PASSWORD
DB_POSTGRESDB_SCHEMA
```

Do not point these variables at the CASE-003 business schema.

## CASE-003 control/business DB

The certified Supabase/PostgREST adapter needs:

| Name | Secret | Where used |
|---|---:|---|
| `CASE003_SUPABASE_URL` | no | workflow/RPC endpoint rendering |
| `CASE003_SUPABASE_PUBLISHABLE_KEY` | public-class key | PostgREST `apikey` header |
| `CASE003_RPC_TOKEN` | yes | dedicated `x-case003-token`; store as n8n credential for runtime use |

Supabase is moving from legacy `anon`/`service_role` keys toward publishable/secret keys. New deployments should use the newer key types where the current adapter contract permits it.

## Provider credentials

These values belong in n8n's encrypted credential store, not environment files when a native credential type exists:

```text
Kapso Webhook HMAC
KAPSO API
CASE003 Supabase RPC Token
CASE003 SMTP OTP            # only where SMTP is reachable
```

Credential names are part of the deployment contract because render/verification scripts resolve by stable name/type.

## One-shot test variables

Variables such as these are temporary controls, not long-lived configuration:

```text
CASE003_GATE*_ON_STARTUP
CASE003_TEST_EMAIL_OVERRIDE
CASE003_GATE10_REQUEST_ID
CASE003_SMTP_NETWORK_PROBE_ON_STARTUP
CASE003_GATE10_SCRUB_ON_STARTUP
```

Rules:

1. Default every one-shot flag to `false`.
2. Set it to `true` only for an explicitly approved operation.
3. Verify durable outcome.
4. Reset to `false` without triggering an unrelated deploy where possible.
5. Remove temporary destination/request variables after the test.
6. Never commit real values.

## Secret escrow

At minimum, disaster recovery requires access to:

```text
N8N_ENCRYPTION_KEY
n8n internal DB password or managed DB recovery access
CASE003 RPC token
Kapso API token
Kapso webhook HMAC secret
mail transport credential/API key
Supabase management/database recovery access
DNS/TLS provider access
```

Store them in a password manager or infrastructure secret manager. A Git repository is not secret escrow.
