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

# Controlled Level-2 WhatsApp reply harness. This is intentionally guarded and
# is not a production business workflow. It keeps the hardened send adapter as
# a separate sub-workflow and only replies to normalized text beginning with
# "PRUEBA CASE002". Every live mutation has an immediate backup checkpoint.
if [ "${CASE002_LEVEL2_REPLY_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case002] preparing guarded Level-2 WhatsApp reply test"

  node /opt/case002/backup-n8n-state.js pre-bind-send-kapso-api
  node /opt/case002/prepare-level2-reply-test.js bind-send
  node /opt/case002/backup-n8n-state.js post-bind-send-kapso-api

  # Execute Sub-workflow loads the published version from the database. Publish
  # the send adapter after credential binding so the live version includes the
  # KAPSO API credential and can be invoked by Receive.
  node /opt/case002/backup-n8n-state.js pre-publish-level2-send
  n8n publish:workflow --id=kapsoMessageSendV1
  node /opt/case002/backup-n8n-state.js post-publish-level2-send

  node /opt/case002/backup-n8n-state.js pre-level2-reply-overlay
  node /opt/case002/prepare-level2-reply-test.js overlay-receive
  node /opt/case002/backup-n8n-state.js post-level2-reply-overlay

  node /opt/case002/backup-n8n-state.js pre-publish-level2-reply
  n8n publish:workflow --id=kapsoMessageReceiveV1
  node /opt/case002/backup-n8n-state.js post-publish-level2-reply

  echo "[case002] guarded Level-2 WhatsApp reply test prepared"
fi

echo "[case002] bootstrap complete; starting n8n"
exec n8n start
