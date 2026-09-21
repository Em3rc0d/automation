#!/bin/sh
set -eu
LOG1=/tmp/case003-gate3-first.log
LOG2=/tmp/case003-gate3-second.log
node /opt/case003/scripts/validate-gate3-execution.js pre
rm -f "$LOG1" "$LOG2"
set +e
N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > "$LOG1" 2>&1
RC1=$?
set -e
node /opt/case003/scripts/validate-gate3-execution.js first
set +e
N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > "$LOG2" 2>&1
RC2=$?
set -e
node /opt/case003/scripts/validate-gate3-execution.js second
rm -f "$LOG1" "$LOG2" /tmp/case003-gate3-execution.json
if [ "$RC1" -ne 0 ] || [ "$RC2" -ne 0 ]; then
  echo "[case003-gate3-test] CLI non-zero first=$RC1 second=$RC2"
  exit 1
fi
echo "[case003-gate3-test] PASS first reserved=true; second reserved=false; duplicate blocked"
