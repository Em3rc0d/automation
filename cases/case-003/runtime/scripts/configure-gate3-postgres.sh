#!/bin/sh
set -eu
CHECK=/tmp/case003-gate3-binding-pre.json
cleanup(){ rm -f "$CHECK"; }
trap cleanup EXIT

node /opt/case003/scripts/backup-n8n-state.js pre-case003-gate3-bind
CASE003_GATE3_CREDENTIAL_ID=case003PostgresV1 CASE003_GATE3_CREDENTIAL_TYPE=postgres CASE003_GATE3_NODE_ID=reserve-postgres CASE003_GATE3_CREDENTIAL_SLOT=postgres node /opt/case003/scripts/verify-gate3-binding.js pre

n8n import:workflow --input=/opt/case003/n8n/case003-due-date-reservation-postgres.json

CASE003_GATE3_CREDENTIAL_ID=case003PostgresV1 CASE003_GATE3_CREDENTIAL_TYPE=postgres CASE003_GATE3_NODE_ID=reserve-postgres CASE003_GATE3_CREDENTIAL_SLOT=postgres node /opt/case003/scripts/verify-gate3-binding.js post

node /opt/case003/scripts/backup-n8n-state.js post-case003-gate3-bind
echo "[case003-gate3-bind] PostgreSQL reservation path configured; workflow remains inactive"
