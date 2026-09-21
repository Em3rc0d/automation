#!/bin/sh
set -eu
WF=/tmp/case003-gate5.json
CHECK=/tmp/case003-gate5-portable-pre.json
cleanup(){ rm -f "$WF" "$CHECK"; }
trap cleanup EXIT

node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate5-import
node /opt/case003/scripts/verify-gate5-import.js pre
node /opt/case003/scripts/render-gate5-workflow.js   /opt/case003/n8n/case003-supplier-query-gate5.template.json "$WF"
n8n import:workflow --input="$WF"
node /opt/case003/scripts/verify-gate5-import.js post
node /opt/case003/scripts/backup-n8n-state.js post-case003-gate5-import
echo "[case003-gate5] workflow imported inactive; existing workflows/credentials unchanged"
