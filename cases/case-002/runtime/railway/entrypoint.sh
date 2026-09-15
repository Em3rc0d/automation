#!/bin/sh
set -eu

# CASE-002 runtime invariant: n8n state lives on the persistent Railway volume.
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-/home/node}"
export DB_SQLITE_DATABASE="${DB_SQLITE_DATABASE:-${N8N_USER_FOLDER}/.n8n/database.sqlite}"
export CASE002_BACKUP_REQUIRED="${CASE002_BACKUP_REQUIRED:-true}"
export CASE002_BACKUP_RETENTION="${CASE002_BACKUP_RETENTION:-20}"

echo "[case002] runtime bootstrap"
echo "[case002] n8n version: $(n8n --version)"
echo "[case002] n8n user folder: ${N8N_USER_FOLDER}"
echo "[case002] sqlite database: ${DB_SQLITE_DATABASE}"

# LAW: before n8n can run migrations, recovery, imports, publishing, or any
# startup mutation, create a consistent SQLite snapshot plus n8n config copy.
# Fail closed by default if an existing DB cannot be backed up.
node /opt/case002/backup-n8n-state.js startup

# One-shot, data-preserving repair for n8n workflow/project visibility.
if [ "${CASE002_RECOVER_WORKFLOWS:-false}" = "repair" ]; then
  echo "[case002] workflow access recovery requested"
  sleep 8
  node /opt/case002/recover-workflows.js

  if [ -s /tmp/case002-selected-db-path ]; then
    RECOVERED_DB_PATH="$(tr -d '\r\n' < /tmp/case002-selected-db-path)"
    case "$RECOVERED_DB_PATH" in
      /home/node/*|/root/*|/data/*)
        export DB_SQLITE_DATABASE="$RECOVERED_DB_PATH"
        echo "[case002] pinning n8n to recovered database: ${DB_SQLITE_DATABASE}"
        # Recovery may have selected a different populated DB. Snapshot the
        # selected DB before n8n starts against it.
        node /opt/case002/backup-n8n-state.js post-recovery-selection
        ;;
      *)
        echo "[case002] refusing unexpected recovered database path: ${RECOVERED_DB_PATH}"
        exit 1
        ;;
    esac
  fi
fi

# The Railway volume is the live n8n state during Level-2 testing. Re-importing
# repository workflow JSON on every container restart overwrites UI-bound
# credentials and live test wiring. Seed imports are therefore opt-in only.
if [ "${CASE002_IMPORT_WORKFLOWS_ON_STARTUP:-false}" = "true" ]; then
  # Snapshot again immediately before explicit imports.
  node /opt/case002/backup-n8n-state.js pre-seed-import

  for f in \
    /opt/case002/kapso-receive.json \
    /opt/case002/kapso-media.json \
    /opt/case002/kapso-send.json \
    /opt/case002/acceptance-probe.json \
    /opt/case002/control-plane-stub.json
  do
    echo "[case002] importing $f"
    n8n import:workflow --input="$f"
  done

  # Publish only webhook workflows required for a fresh Level-2 seed.
  n8n publish:workflow --id=case002ControlPlaneStubV1 || true
  n8n publish:workflow --id=kapsoMessageReceiveV1 || true
else
  echo "[case002] skipping workflow import; preserving persisted n8n state"
fi

echo "[case002] bootstrap complete; starting n8n"
exec n8n start
