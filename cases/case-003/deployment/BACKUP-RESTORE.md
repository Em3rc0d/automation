# Backup and restore

A backup is only valid after a restore drill.

## Recovery set

### n8n with PostgreSQL

Back up:

```text
n8n PostgreSQL database
N8N_ENCRYPTION_KEY in secret escrow
/home/node/.n8n if it contains binary/file state needed by workflows
deployment repository commit SHA
DNS/provider configuration inventory
```

### n8n current Railway SQLite profile

Back up together:

```text
/home/node/.n8n/database.sqlite
/home/node/.n8n/config if present
required binary/file directories
N8N_ENCRYPTION_KEY
repository commit SHA
```

Take SQLite copies while n8n is stopped or use a consistency-safe snapshot mechanism. The live runtime already uses a backup-before-mutation script.

### CASE-003 Supabase

Use managed backups plus periodic logical dumps for independent recovery.

Supabase documents:

```text
supabase db dump --db-url ... -f roles.sql --role-only
supabase db dump --db-url ... -f schema.sql
supabase db dump --db-url ... -f data.sql --use-copy --data-only
```

Do not put generated dumps containing customer data in this source repository.

## Backup cadence

Suggested pilot baseline:

```text
before every deployment/migration/import: mandatory
n8n DB: daily
CASE-003 DB: provider daily backup + independent logical backup
off-site retention: at least one copy outside the runtime provider
restore drill: monthly during pilot, then risk-based
```

Tune retention to contractual/legal requirements.

## Compose backup helper

`scripts/backup-compose.sh` creates a local operator backup directory containing:

- PostgreSQL custom-format dump for n8n;
- tar archive of the n8n filesystem volume;
- metadata with timestamp and git commit when available.

It intentionally does not export decrypted credentials.

## Restore sequence

1. isolate the target environment from provider traffic;
2. preserve the failed/current state before overwriting it;
3. checkout the exact repository commit;
4. restore `N8N_ENCRYPTION_KEY`;
5. restore n8n DB;
6. restore filesystem/binary data;
7. restore/reconnect CASE-003 DB;
8. start n8n;
9. verify workflow/credential metadata counts;
10. verify credentials can decrypt by non-destructive tests;
11. verify webhook URLs;
12. run CASE-003 smoke tests;
13. re-enable provider traffic.

## Restore acceptance

Do not call restore successful until:

```text
n8n starts
owner can log in
expected workflows exist
credential metadata exists
at least one credential-backed non-destructive test succeeds
CASE-003 DB functions exist
provider binding exists
webhook returns expected auth behavior
no unexpected outbound delivery occurs
```

## RPO/RTO

Record actual measured values after restore drills. Do not invent an RPO/RTO from backup schedule alone.
