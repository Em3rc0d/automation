#!/bin/sh
set -eu
WF=/tmp/case003-gate3-supabase.json
CHECK=/tmp/case003-gate3-binding-pre.json
cleanup(){ rm -f "$WF" "$CHECK"; }
trap cleanup EXIT

node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate3-bind
CASE003_GATE3_CREDENTIAL_ID=case003RpcAuthV1 CASE003_GATE3_CREDENTIAL_TYPE=httpHeaderAuth CASE003_GATE3_NODE_ID=reserve-rpc CASE003_GATE3_CREDENTIAL_SLOT=httpHeaderAuth node /opt/case003/scripts/verify-gate3-binding.js pre

node /opt/case003/scripts/render-gate3-supabase-workflow.js   /opt/case003/n8n/case003-due-date-reservation-supabase-rpc.template.json "$WF"
n8n import:workflow --input="$WF"

CASE003_GATE3_CREDENTIAL_ID=case003RpcAuthV1 CASE003_GATE3_CREDENTIAL_TYPE=httpHeaderAuth CASE003_GATE3_NODE_ID=reserve-rpc CASE003_GATE3_CREDENTIAL_SLOT=httpHeaderAuth node /opt/case003/scripts/verify-gate3-binding.js post

node /opt/case003/scripts/backup-n8n-state.js post-case003-gate3-bind
echo "[case003-gate3-bind] Supabase reservation path configured; workflow remains inactive"
