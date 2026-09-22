#!/bin/sh
set -eu
WORKFLOW=/opt/case003/n8n/case003-due-date-evaluation.json
node /opt/case003/scripts/backup-n8n-state.js pre-case003-import
node /opt/case003/scripts/verify-case003-import.js pre
n8n import:workflow --input="$WORKFLOW"
node /opt/case003/scripts/verify-case003-import.js post
node /opt/case003/scripts/backup-n8n-state.js post-case003-import
echo "[case003] Gate 1 PASS: workflow imported inactive; credential count unchanged"
