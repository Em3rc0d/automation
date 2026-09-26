# Local Installation Backup / Restore

Status: **OPERATOR TOOLING / LOCAL BUNDLE SCOPE**

The zero-cost pilot path now has a backup/restore utility for installation bundles and file-backed runtime evidence.

It is deliberately narrower than a production database backup.

## Create

```bash
python tools/savings/backup_bundle.py create \
  --bundle .local/installations/acme/PAYMENT_REMINDER_AUTOMATION@0.1 \
  --out .local/backups/acme-payment-reminder.zip
```

The archive:
- includes the local installation bundle and runtime/audit evidence beneath it;
- stores a per-file SHA-256 manifest;
- emits an archive SHA-256 sidecar;
- rejects symlinks, path traversal and common secret material;
- preserves only credential references such as `credref:...`.

## Verify

```bash
python tools/savings/backup_bundle.py verify \
  --archive .local/backups/acme-payment-reminder.zip
```

## Restore

Restore only to an empty target:

```bash
python tools/savings/backup_bundle.py restore \
  --archive .local/backups/acme-payment-reminder.zip \
  --target .local/restored/acme-payment-reminder
```

The restored tree is independently re-scanned before success is reported.

## Boundary

This closes backup/restore mechanics for the **local installation bundle**.

It does **not** close the MK1 production-control-plane backup gate. A real PostgreSQL/Supabase deployment must still prove its own database backup, restore point, RPO/RTO and tenant-isolation behavior.
