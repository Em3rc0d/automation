# Upgrade and rollback

## Pinning law

Current reference:

```text
n8nio/n8n:2.38.7
```

Do not use `latest`.

A version bump is a production change because n8n can perform database migrations at startup.

## Upgrade procedure

1. read n8n release notes and breaking changes;
2. create a full pre-upgrade backup;
3. record current image digest/version;
4. test the new version against a clone/staging DB;
5. run `n8n audit`;
6. test webhook ingress;
7. test Supabase RPC credential;
8. test Kapso signature validation;
9. test one deterministic CASE-003 invoice query;
10. deploy production;
11. verify health before re-enabling provider traffic;
12. record evidence and new manifest version.

## Rollback rule

Application rollback and database rollback are different operations.

If the new n8n version migrated the internal DB schema, simply changing the Docker tag back may not be safe. Use the documented supported downgrade path or restore the pre-upgrade DB snapshot together with the prior image.

## Railway

With a volume-backed service, Railway does not keep two deployments mounted to the same volume simultaneously. Plan a short maintenance/handover window for stateful changes.

## Docker Compose

Safe pattern:

```bash
./scripts/backup-compose.sh
docker compose pull
docker compose up -d
docker compose ps
./scripts/smoke-http.sh
```

Never run `docker compose down -v` in production. `-v` deletes named volumes.

## CASE-003 schema migration

For business DB migrations:

```text
backup
-> apply migration
-> run positive test
-> run negative authorization/tenancy test
-> provider regression
-> evidence
```

Do not edit an already-applied migration to disguise history. Add a new migration/hotfix and record it in the manifest.
