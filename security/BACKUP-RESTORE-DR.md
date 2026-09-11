# Backup, Restore and Disaster Recovery Baseline

Status: **MK0 AUTHORITY**
Updated: 2026-09-11

## Scope

Backup policy covers control-plane database, tenant configuration, automation/template manifests, audit/incident records and retained customer files. Provider-owned systems remain recoverable only through provider APIs/exports and must not be assumed to be backed up by us.

## Baseline

- managed PostgreSQL point-in-time recovery/backups where plan supports it;
- periodic logical export of control-plane critical tables;
- versioned workflow/template artifacts in Git;
- tenant files stored in versioned/backup-capable object storage where required;
- secrets backed up only through the secret-store/provider mechanism, never plaintext exports;
- restoration tested on a non-production environment;
- backup access restricted and audited.

## RPO/RTO classes

Before production, each client automation is classified:
- **Class A**: business-critical/high side-effect risk — explicit RPO/RTO agreed.
- **Class B**: normal operational automation — restore within normal support window.
- **Class C**: reproducible/non-critical cache/reporting — can rebuild from source systems.

MK1 does not promise enterprise RPO/RTO values before measured infrastructure capability exists.

## Restore drill

At minimum verify:
1. database backup can be restored;
2. migrations apply cleanly to restored data;
3. tenant isolation/RLS still holds;
4. connector metadata is present without exposing secrets;
5. workflow/template version references resolve;
6. incident/audit history remains intact;
7. no external side effects are replayed simply because state was restored.

## Disaster-recovery rule

Recovery of internal state must not re-send messages, recreate invoices, charge payments, duplicate tickets or repeat any external side effect. Reconciliation after restore uses persisted provider IDs/idempotency keys and explicit operator action where ambiguity remains.
