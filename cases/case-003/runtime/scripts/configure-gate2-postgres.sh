#!/bin/sh
set -eu

CRED=/tmp/case003-postgres-credential.json
CHECK=/tmp/case003-gate2-binding-pre.json
WF=/opt/case003/n8n/case003-due-date-evaluation-postgres.json

cleanup() {
  rm -f "$CRED" "$CHECK"
}
trap cleanup EXIT

export CASE003_GATE2_CREDENTIAL_ID=case003PostgresV1
export CASE003_GATE2_CREDENTIAL_NAME="CASE003 PostgreSQL"
export CASE003_GATE2_CREDENTIAL_TYPE=postgres
export CASE003_GATE2_NODE_ID=query
export CASE003_GATE2_CREDENTIAL_SLOT=postgres

node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate2-postgres
node /opt/case003/scripts/verify-gate2-binding.js pre
node /opt/case003/scripts/prepare-postgres-credential.js "$CRED"

n8n import:credentials --input="$CRED"
n8n import:workflow --input="$WF"

node /opt/case003/scripts/verify-gate2-binding.js post
node /opt/case003/scripts/backup-n8n-state.js post-case003-gate2-postgres
echo "[case003-gate2-pg] configuration complete; workflow remains inactive"
