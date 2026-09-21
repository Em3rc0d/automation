#!/bin/sh
set -eu
WF=/tmp/case003-gate5-postgres.json
CHECK=/tmp/case003-gate5-portable-pre.json
cleanup(){ rm -f "$WF" "$CHECK"; }
trap cleanup EXIT

node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate5-import
CASE003_GATE5_CREDENTIAL_ID=case003PostgresV1 node /opt/case003/scripts/verify-gate5-import.js pre
node /opt/case003/scripts/render-gate5-postgres-workflow.js   /opt/case003/n8n/case003-supplier-query-gate5-postgres.template.json "$WF"
n8n import:workflow --input="$WF"
CASE003_GATE5_CREDENTIAL_ID=case003PostgresV1 node /opt/case003/scripts/verify-gate5-import.js post
node /opt/case003/scripts/backup-n8n-state.js post-case003-gate5-import
echo "[case003-gate5] direct-PostgreSQL workflow imported inactive"
