# MK1 Pre-Pilot Operations Hardening

Status: **LOCAL PRE-PILOT EVIDENCE / NOT PRODUCTION CERTIFICATION**

This slice removes two additional operational uncertainties without creating paid infrastructure.

## Installation backup + restore

`tools/savings/backup_bundle.py` creates, verifies and restores local Savings installation bundles using only Python's standard library.

The backup:
- uses archive mode `0600`;
- stores a per-file SHA-256 manifest;
- rejects path traversal and symlinks;
- rejects secret-like filenames such as `.env`, credentials, PEM/key/P12/PFX files;
- verifies installation identity and every file again after restore;
- preserves runtime-state audit/idempotency files inside the bundle;
- deliberately excludes external credential environment files.

Example:

```bash
python tools/savings/backup_bundle.py create \
  --bundle .local/installations/acme/PAYMENT_REMINDER_AUTOMATION@0.1 \
  --out .local/backups/acme-payment.tar.gz

python tools/savings/backup_bundle.py verify \
  --archive .local/backups/acme-payment.tar.gz

python tools/savings/backup_bundle.py restore \
  --archive .local/backups/acme-payment.tar.gz \
  --out .local/restored/acme-payment
```

## Incident rehearsal

`operations/savings/runtime/incident_drill.mjs` intentionally causes a message-provider failure and proves the safe recovery sequence:

```text
provider failure
→ execution failed
→ Incident created
→ 0 SavingsEvents
→ operator repairs dependency
→ replay same business unit
→ one outbound side effect
→ one SavingsEvent
```

This is local rehearsal evidence only. A paying/funded pilot still requires a live-provider incident drill.

## Economic boundary

Neither feature provisions a database, cloud scheduler, Railway instance, n8n instance or per-tenant server.
