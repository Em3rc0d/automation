#!/bin/sh
set -eu
WF=/tmp/case003-gate7.json
CHECK=/tmp/case003-gate7-portable-pre.json
cleanup(){ rm -f "$WF" "$CHECK"; }
trap cleanup EXIT
node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate7-import
node /opt/case003/scripts/verify-gate7-import.js pre rpc
node /opt/case003/scripts/render-gate7-workflow.js /opt/case003/n8n/case003-kapso-ingress-gate7.template.json "$WF"
n8n import:workflow --input="$WF"
node /opt/case003/scripts/verify-gate7-import.js post rpc
node /opt/case003/scripts/backup-n8n-state.js post-case003-gate7-import
echo "[case003-gate7] Supabase workflow imported inactive"
