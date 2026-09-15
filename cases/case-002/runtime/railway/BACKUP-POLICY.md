# CASE-002 Backup Law

This file defines a hard operational invariant for CASE-002. It is not optional guidance.

## Law

No mutation of live n8n state may happen without a verified backup immediately beforehand.

A mutation includes, at minimum:

- Railway redeploys or restarts that may run n8n migrations.
- Workflow import, replacement, deletion, publishing, unpublishing, or activation.
- Credential creation, update, rebinding, or deletion.
- Manual production workflow edits in the n8n UI.
- Recovery or ownership/project repair.
- SQLite path, `N8N_USER_FOLDER`, or encryption/config changes.

## Required backup layers

### Layer 1 — Persistent state snapshot

Before startup mutations, `/opt/case002/backup-n8n-state.js` creates a consistent SQLite snapshot with `VACUUM INTO` under:

`$N8N_USER_FOLDER/.n8n/backups/snapshot-<timestamp>-<label>/`

Each snapshot contains:

- `database.sqlite`
- n8n `config` when present
- `manifest.json` with SHA-256, file size, table counts, label, and source path

The backup helper defaults to fail-closed (`CASE002_BACKUP_REQUIRED=true`). If an existing database cannot be backed up, startup must stop.

Default retention is 20 snapshots (`CASE002_BACKUP_RETENTION=20`).

### Layer 2 — Source control

Workflow logic must be source-first. Any live workflow wiring or node change that is intended to survive must be mirrored into the repository workflow JSON before the change is considered complete.

Repository JSON must never contain plaintext credentials, API keys, tokens, webhook secrets, or encryption keys.

### Layer 3 — Credential recovery record

Credential values remain outside Git. The live SQLite/config snapshot is the recovery source for encrypted credential records and the n8n encryption configuration. Documentation may record credential *names*, provider, node bindings, and allowed domains, but never secret values.

## Required procedure before any manual live change

1. Verify `N8N_USER_FOLDER=/home/node` and `DB_SQLITE_DATABASE=/home/node/.n8n/database.sqlite`.
2. Run `node /opt/case002/backup-n8n-state.js <checkpoint-label>`.
3. Confirm the output contains `created`, a SHA-256, and expected workflow/user counts.
4. Make exactly one logical change set.
5. Verify the change in n8n.
6. Mirror durable workflow changes into GitHub.
7. Create a post-change checkpoint before proceeding to the next logical change set.

## Forbidden operations

- Do not redeploy merely to test a theory when a read-only inspection can answer it.
- Do not use repository imports to overwrite a working live workflow unless a fresh checkpoint exists.
- Do not store live-only workflow changes without updating source control.
- Do not paste secrets into chat, GitHub, logs, fixtures, evidence reports, or workflow JSON.
- Do not assume Railway plan-level backups exist. CASE-002 currently relies on its own persistent-volume snapshots plus source control.

## Recovery priority

1. Verified CASE-002 snapshot on persistent volume.
2. Source-controlled workflow JSON plus documented bindings.
3. Recreate credentials manually from the provider account without exposing secret material in chat or Git.

Any future infrastructure migration must preserve this law or replace it with a stronger backup and restore mechanism before migration begins.
