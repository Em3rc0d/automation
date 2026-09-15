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

This ledger never stores credential values, API keys, webhook secrets, encryption keys, tokens, or other secret material.
