#!/bin/sh
set -eu

echo "[case002] runtime bootstrap"
echo "[case002] n8n version: $(n8n --version)"

# One-shot, data-preserving repair for n8n workflow/project visibility. The
# recovery script backs up the SQLite database and exports all workflows before
# it adds only missing access/ownership association rows.
if [ "${CASE002_RECOVER_WORKFLOWS:-false}" = "repair" ]; then
  echo "[case002] workflow access recovery requested"
  node /opt/case002/recover-workflows.js
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
