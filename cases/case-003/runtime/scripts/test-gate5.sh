#!/bin/sh
set -eu
LOG=/tmp/case003-gate5-cli.log
rm -f "$LOG"
set +e
N8N_LOG_OUTPUT=console n8n execute --id=case003SupplierQueryGate5V1 --rawOutput > "$LOG" 2>&1
RC=$?
set -e
node /opt/case003/scripts/validate-gate5-execution.js
rm -f "$LOG"
if [ "$RC" -ne 0 ]; then
  echo "[case003-gate5-test] CLI non-zero rc=$RC"
  exit 1
fi
echo "[case003-gate5-test] PASS supplier access-control proof; outbound disabled"
