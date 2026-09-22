#!/bin/sh
set -eu

CRED=/tmp/case003-rpc-credential.json
WF=/tmp/case003-due-date-evaluation-supabase-rpc.json
CHECK=/tmp/case003-gate2-binding-pre.json

cleanup() {
  rm -f "$CRED" "$WF" "$CHECK"
}
trap cleanup EXIT

node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate2
node /opt/case003/scripts/verify-gate2-binding.js pre
node /opt/case003/scripts/prepare-rpc-credential.js "$CRED"
node /opt/case003/scripts/render-supabase-rpc-workflow.js   /opt/case003/n8n/case003-due-date-evaluation-supabase-rpc.template.json   "$WF"

# With no --projectId/--userId, n8n assigns a new credential to the instance owner's personal project.
n8n import:credentials --input="$CRED"
n8n import:workflow --input="$WF"

node /opt/case003/scripts/verify-gate2-binding.js post
node /opt/case003/scripts/backup-n8n-state.js post-case003-gate2
echo "[case003-gate2-bind] configuration complete; workflow remains inactive"
