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

This ledger never stores credential values, API keys, webhook secrets, encryption keys, tokens, or other secret material.
