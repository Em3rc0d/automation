#!/bin/sh
set -eu
LOG=/tmp/case003-gate2-cli.log
node /opt/case003/scripts/validate-gate2-execution.js pre
rm -f "$LOG"
set +e
N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > "$LOG" 2>&1
RC=$?
set -e
node /opt/case003/scripts/validate-gate2-execution.js post
rm -f "$LOG" /tmp/case003-gate2-execution-pre.json
if [ "$RC" -ne 0 ]; then
  echo "[case003-gate2-test] CLI returned non-zero after persisted-result validation: $RC"
  exit "$RC"
fi
echo "[case003-gate2-test] execution proof complete"
