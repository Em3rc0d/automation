#!/bin/sh
set -eu
LOG=/tmp/case003-gate7-server.log
PID=
cleanup(){
  if [ -n "${PID:-}" ] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    wait "$PID" 2>/dev/null || true
  fi
  n8n update:workflow --id=case003KapsoIngressGate7V1 --active=false >/dev/null 2>&1 || true
  rm -f "$LOG"
}
trap cleanup EXIT INT TERM

node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate7-http-test
node /opt/case003/scripts/verify-gate7-test-state.js pre
n8n update:workflow --id=case003KapsoIngressGate7V1 --active=true
N8N_LOG_OUTPUT=console n8n start > "$LOG" 2>&1 &
PID=$!
READY=false
for i in $(seq 1 40); do
  if node -e "fetch('http://127.0.0.1:5678/healthz',{signal:AbortSignal.timeout(1000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then READY=true; break; fi
  sleep 1
done
if [ "$READY" != "true" ]; then tail -n 100 "$LOG" || true; exit 1; fi
CASE003_GATE7_BASE_URL=http://127.0.0.1:5678 node /opt/case003/scripts/test-gate7-http.js
cleanup
trap - EXIT INT TERM
node /opt/case003/scripts/verify-gate7-test-state.js post
rm -f /tmp/case003-gate7-test-portable-pre.json
node /opt/case003/scripts/backup-n8n-state.js post-case003-gate7-http-test
echo "[case003-gate7-http] PASS signed Kapso provider ingress; workflow restored inactive"
