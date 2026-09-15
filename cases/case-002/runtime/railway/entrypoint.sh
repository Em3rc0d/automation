#!/bin/sh
set -eu

# Railway source rebuild marker: workflow recovery
# Pin n8n's user folder to the persistent Railway volume namespace.
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-/home/node}"

echo "[case002] runtime bootstrap"
echo "[case002] n8n version: $(n8n --version)"
echo "[case002] n8n user folder: ${N8N_USER_FOLDER}"

# One-shot, data-preserving repair for n8n workflow/project visibility.
# The recovery helper discovers every plausible SQLite DB, selects the populated
# one, backs it up, repairs only missing ownership/access rows, and writes the
# selected DB path to /tmp/case002-selected-db-path.
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
        ;;
      *)
        echo "[case002] refusing unexpected recovered database path: ${RECOVERED_DB_PATH}"
        ;;
    esac
  fi
fi

# The Railway volume is the live n8n state during Level-2 testing. Re-importing
# repository workflow JSON on every container restart overwrites UI-bound
# credentials and live test wiring. Seed imports are therefore opt-in only.
if [ "${CASE002_IMPORT_WORKFLOWS_ON_STARTUP:-false}" = "true" ]; then
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
