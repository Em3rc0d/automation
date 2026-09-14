#!/bin/sh
set -eu

echo "[case002] runtime bootstrap"
echo "[case002] n8n version: $(n8n --version)"

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

# Activate only webhook workflows required for Level-2 ingress plumbing.
# Provider credentials/secrets are still bound outside Git before live execution.
n8n update:workflow --id=case002ControlPlaneStubV1 --active=true || true
n8n update:workflow --id=kapsoMessageReceiveV1 --active=true || true

echo "[case002] imports complete; starting n8n"
exec n8n start
