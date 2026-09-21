#!/bin/sh
set -eu
OUT=/tmp/case003-gate2-execution.json
rm -f "$OUT"
n8n execute --id=case003DueDateEvaluationV1 --rawOutput > "$OUT"
node /opt/case003/scripts/validate-gate2-execution.js "$OUT"
rm -f "$OUT"
