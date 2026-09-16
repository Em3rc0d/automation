# CASE-002 Backup Checkpoint Ledger

Operational rule: every live n8n mutation requires a verified checkpoint immediately beforehand. See `cases/case-002/runtime/railway/BACKUP-POLICY.md`.

## Verified checkpoints

### 2026-09-15T17:29:01Z — `pre-backup-law-deploy`

- Source database: `/home/node/.n8n/database.sqlite`
- Snapshot database: `/home/node/.n8n/backups/snapshot-20260915T172901Z-pre-backup-law-deploy/database.sqlite`
- Workflow count before snapshot: `5`
- Snapshot size: `2097152` bytes
- SHA-256: `e75e0864cecddbaf31021aa4e97b49d92ec8f810289da9f63f9a3be70c04adf6`
- n8n config copied: `yes`
- Verification: snapshot file exists, is non-empty, and checksum was produced successfully.

### 2026-09-15T20:55:50Z — `post-backup-law-deploy`

- Source database: `/home/node/.n8n/database.sqlite`
- Snapshot database: `/home/node/.n8n/backups/snapshot-20260915T205550Z-post-backup-law-deploy/database.sqlite`
- Workflow count before snapshot: `5`
- Credential count before snapshot: `0`
- User count before snapshot: `1`
- Snapshot size: `2097152` bytes
- SHA-256: `e75e0864cecddbaf31021aa4e97b49d92ec8f810289da9f63f9a3be70c04adf6`
- n8n config copied: `yes`
- Verification: snapshot file exists, is non-empty, manifest was written, and checksum matched the manifest.
- Note: the label was created before Railway was confirmed to be running the new backup-law image; the snapshot itself remains valid and restorable.

### 2026-09-15T23:55:04Z — `pre-latest-commit-deploy`

- Source database: `/home/node/.n8n/database.sqlite`
- Snapshot database: `/home/node/.n8n/backups/snapshot-20260915T235504Z-pre-latest-commit-deploy/database.sqlite`
- Workflow count before snapshot: `5`
- SHA-256: `e75e0864cecddbaf31021aa4e97b49d92ec8f810289da9f63f9a3be70c04adf6`
- n8n config copied: `yes`
- Verification: snapshot file exists, is non-empty, and the independently calculated checksum matched the backup SHA-256.
- Deployment immediately following this checkpoint: Git commit `61b4dd03e87636e41adc7851512158b0c3102ccc` (`chore(case-002): force rebuild with backup law runtime`), Railway deployment successful at 2026-09-15 18:47 GMT-5.

### 2026-09-16T00:02:25Z — `pre-kapso-credentials`

- Source database: `/home/node/.n8n/database.sqlite`
- Snapshot database: `/home/node/.n8n/backups/snapshot-2026-09-16T00-02-25-072Z-pre-kapso-credentials/database.sqlite`
- Workflow count before snapshot: `5`
- Credential count before snapshot: `0`
- User count before snapshot: `1`
- SHA-256: `ea9592ff89a7fbde8bbb2ae8c5bf4183db9fae66d9bbc8e8a9e9ccd4ab72018b`
- Verification: backup helper completed successfully and reported the snapshot path, SHA-256, workflow count, credential count, and user count.
- Note: a later verification command selected an older manifest because the backup directories use two timestamp naming formats and a plain lexical sort does not reliably identify the newest snapshot. This does not invalidate the `pre-kapso-credentials` checkpoint itself.

### 2026-09-16T00:23:05Z — `post-kapso-hmac-credential` (no credential persisted)

- Source database: `/home/node/.n8n/database.sqlite`
- Snapshot database: `/home/node/.n8n/backups/snapshot-2026-09-16T00-23-05-747Z-post-kapso-hmac-credential/database.sqlite`
- Workflow count: `5`
- Credential count: `0`
- User count: `1`
- SHA-256: `ea9592ff89a7fbde8bbb2ae8c5bf4183db9fae66d9bbc8e8a9e9ccd4ab72018b`
- Verification: the snapshot is valid, but its identical SHA-256 to `pre-kapso-credentials` plus `credentials_entity=0` proves the attempted HMAC credential creation did not mutate the live persistent database.
- Read-only follow-up confirmed process 1 uses `N8N_USER_FOLDER=/home/node` and `DB_SQLITE_DATABASE=/home/node/.n8n/database.sqlite`, and only one non-backup SQLite database exists under `/home/node`, `/root`, and `/data`; that database contains `5` workflows, `0` credentials, and `1` user.
- Operational conclusion: this is not a wrong-database-path issue. Credential creation must be re-attempted and verified at the UI/API level before any additional credential or workflow binding changes.

### 2026-09-16T00:32:53Z — `post-kapso-hmac-credential` (credential persisted)

- Source database: `/home/node/.n8n/database.sqlite`
- Snapshot database: `/home/node/.n8n/backups/snapshot-2026-09-16T00-32-53-966Z-post-kapso-hmac-credential/database.sqlite`
- Workflow count: `5`
- Credential count: `1`
- User count: `1`
- Persisted credential metadata: one credential of type `crypto`, ID `pw3kluykAPVTJDmZ`, current name `Crypto account`.
- SHA-256: `cbd52cf5cab8200bd31ac471e61c82b5d8fa640f700e7b8001f51d68dbd8f788`
- Verification: direct read-only query returned `credentials_entity=1`, and the post-change backup produced a new SHA-256 distinct from the pre-credential state. No credential secret value is recorded here.

### 2026-09-16T00:34:06Z / 00:34:32Z — attempted HMAC credential rename (no-op)

- `pre-rename-kapso-hmac` and `post-rename-kapso-hmac` both report `5` workflows, `1` credential, `1` user.
- Both snapshots have SHA-256 `cbd52cf5cab8200bd31ac471e61c82b5d8fa640f700e7b8001f51d68dbd8f788`.
- Direct read-only query still reports credential ID `pw3kluykAPVTJDmZ`, name `Crypto account`, type `crypto`.
- Conclusion: the attempted rename did not mutate persistent state. The credential itself remains valid and backed up; the default name is cosmetic and does not block the next credential-creation step.

This ledger never stores credential values, API keys, webhook secrets, encryption keys, tokens, or other secret material.
