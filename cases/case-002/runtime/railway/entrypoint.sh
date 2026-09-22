#!/bin/sh
set -eu

# CASE-002 runtime invariant: n8n state lives on the persistent Railway volume.
export N8N_USER_FOLDER="${N8N_USER_FOLDER:-/home/node}"
export DB_SQLITE_DATABASE="${DB_SQLITE_DATABASE:-${N8N_USER_FOLDER}/.n8n/database.sqlite}"
export CASE002_BACKUP_REQUIRED="${CASE002_BACKUP_REQUIRED:-true}"
export CASE002_BACKUP_RETENTION="${CASE002_BACKUP_RETENTION:-20}"

echo "[case002] runtime bootstrap"
echo "[case002] n8n version: $(n8n --version)"
echo "[case002] n8n user folder: ${N8N_USER_FOLDER}"
echo "[case002] sqlite database: ${DB_SQLITE_DATABASE}"

# LAW: before n8n can run migrations, recovery, imports, publishing, or any
# startup mutation, create a consistent SQLite snapshot plus n8n config copy.
# Fail closed by default if an existing DB cannot be backed up.
node /opt/case002/backup-n8n-state.js startup

# One-shot, data-preserving repair for n8n workflow/project visibility.
if [ "${CASE002_RECOVER_WORKFLOWS:-false}" = "repair" ]; then
  echo "[case002] workflow access recovery requested"
  sleep 8
  node /opt/case002/recover-workflows.js

  if [ -s /tmp/case002-selected-db-path ]; then
    RECOVERED_DB_PATH="$(tr -d '\r\n' < /tmp/case002-selected-db-path)"
    case "$RECOVERED_DB_PATH" in
      /home/node/*|/root/*|/data/*)
        export DB_SQLITE_DATABASE="$RECOVERED_DB_PATH"
        echo "[case002] pinning n8n to recovered database: ${DB_SQLITE_DATABASE}"
        node /opt/case002/backup-n8n-state.js post-recovery-selection
        ;;
      *)
        echo "[case002] refusing unexpected recovered database path: ${RECOVERED_DB_PATH}"
        exit 1
        ;;
    esac
  fi
fi

# The Railway volume is the live n8n state during Level-2 testing. Re-importing
# repository workflow JSON on every container restart overwrites UI-bound
# credentials and live test wiring. Seed imports are therefore opt-in only.
if [ "${CASE002_IMPORT_WORKFLOWS_ON_STARTUP:-false}" = "true" ]; then
  node /opt/case002/backup-n8n-state.js pre-seed-import

  for f in \
    /opt/case002/kapso-receive.json \
    /opt/case002/kapso-media.json \
    /opt/case002/kapso-send.json \
    /opt/case002/acceptance-probe.json \
    /opt/case002/control-plane-stub.json
  do
    echo "[case002] importing $f"
    n8n import:workflow --input="$f"
  done

  n8n publish:workflow --id=case002ControlPlaneStubV1 || true
  n8n publish:workflow --id=kapsoMessageReceiveV1 || true
else
  echo "[case002] skipping workflow import; preserving persisted n8n state"
fi

# Controlled Level-2 WhatsApp reply harness.
if [ "${CASE002_LEVEL2_REPLY_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case002] preparing guarded Level-2 WhatsApp reply test"

  node /opt/case002/backup-n8n-state.js pre-bind-send-kapso-api
  node /opt/case002/prepare-level2-reply-test.js bind-send
  node /opt/case002/backup-n8n-state.js post-bind-send-kapso-api

  node /opt/case002/backup-n8n-state.js pre-publish-level2-send
  n8n publish:workflow --id=kapsoMessageSendV1
  node /opt/case002/backup-n8n-state.js post-publish-level2-send

  node /opt/case002/backup-n8n-state.js pre-level2-reply-overlay
  node /opt/case002/prepare-level2-reply-test.js overlay-receive
  node /opt/case002/backup-n8n-state.js post-level2-reply-overlay

  node /opt/case002/backup-n8n-state.js pre-publish-level2-reply
  n8n publish:workflow --id=kapsoMessageReceiveV1
  node /opt/case002/backup-n8n-state.js post-publish-level2-reply

  echo "[case002] guarded Level-2 WhatsApp reply test prepared"
fi

# CASE-local conversational appointment harness (source package v1.1+). It proves
# the WhatsApp intake loop and persists a sandbox Appointment in workflow static
# data. It does NOT
# claim Google Calendar authority. External calendar availability/create remains
# a separate certification step.
if [ "${CASE002_LEVEL2_APPOINTMENT_AGENT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case002] preparing Level-2 workshop appointment agent"

  node /opt/case002/backup-n8n-state.js pre-appointment-agent-bind-send
  node /opt/case002/prepare-level2-reply-test.js bind-send
  node /opt/case002/backup-n8n-state.js post-appointment-agent-bind-send

  node /opt/case002/backup-n8n-state.js pre-appointment-agent-publish-send
  n8n publish:workflow --id=kapsoMessageSendV1
  node /opt/case002/backup-n8n-state.js post-appointment-agent-publish-send

  # Ensure the hardened PRUEBA CASE002 gate exists before attaching the normal
  # conversational branch. This operation is idempotent at the workflow shape.
  node /opt/case002/backup-n8n-state.js pre-appointment-agent-base-overlay
  node /opt/case002/prepare-level2-reply-test.js overlay-receive
  node /opt/case002/backup-n8n-state.js post-appointment-agent-base-overlay

  node /opt/case002/backup-n8n-state.js pre-appointment-agent-import
  n8n import:workflow --input=/opt/case002/appointment-agent.json
  node /opt/case002/backup-n8n-state.js post-appointment-agent-import

  node /opt/case002/backup-n8n-state.js pre-appointment-agent-publish
  n8n publish:workflow --id=case002Level2AppointmentAgentV1
  node /opt/case002/backup-n8n-state.js post-appointment-agent-publish

  node /opt/case002/backup-n8n-state.js pre-appointment-agent-receive-overlay
  node /opt/case002/prepare-level2-appointment-agent.js overlay-receive
  node /opt/case002/backup-n8n-state.js post-appointment-agent-receive-overlay

  node /opt/case002/backup-n8n-state.js pre-appointment-agent-publish-receive
  n8n publish:workflow --id=kapsoMessageReceiveV1
  node /opt/case002/backup-n8n-state.js post-appointment-agent-publish-receive

  echo "[case002] Level-2 workshop appointment agent prepared"
fi

# CASE-002 hybrid Gemini conversation PoC. This mode reuses the existing n8n
# service and does not create another Railway service. Gemini is interpretation
# and response rendering only; deterministic CASE-002 policy remains the authority for routing and side effects.
if [ "${CASE002_LEVEL2_GEMINI_POC_ON_STARTUP:-false}" = "true" ]; then
  echo "[case002] preparing Level-2 Gemini conversation PoC"

  node /opt/case002/backup-n8n-state.js pre-gemini-poc-bind-send
  node /opt/case002/prepare-level2-reply-test.js bind-send
  node /opt/case002/backup-n8n-state.js post-gemini-poc-bind-send

  node /opt/case002/backup-n8n-state.js pre-gemini-poc-publish-send
  n8n publish:workflow --id=kapsoMessageSendV1
  node /opt/case002/backup-n8n-state.js post-gemini-poc-publish-send

  node /opt/case002/backup-n8n-state.js pre-gemini-poc-base-overlay
  node /opt/case002/prepare-level2-reply-test.js overlay-receive
  node /opt/case002/backup-n8n-state.js post-gemini-poc-base-overlay

  node /opt/case002/backup-n8n-state.js pre-gemini-interpreter-import
  n8n import:workflow --input=/opt/case002/gemini-interpreter.json
  node /opt/case002/backup-n8n-state.js post-gemini-interpreter-import

  node /opt/case002/backup-n8n-state.js pre-gemini-response-renderer-import
  n8n import:workflow --input=/opt/case002/gemini-response-renderer.json
  node /opt/case002/backup-n8n-state.js post-gemini-response-renderer-import

  node /opt/case002/backup-n8n-state.js pre-gemini-credential-bind
  node /opt/case002/prepare-level2-gemini-poc.js bind-gemini
  node /opt/case002/backup-n8n-state.js post-gemini-credential-bind

  node /opt/case002/backup-n8n-state.js pre-gemini-interpreter-publish
  n8n publish:workflow --id=case002GeminiInterpreterV1
  node /opt/case002/backup-n8n-state.js post-gemini-interpreter-publish

  node /opt/case002/backup-n8n-state.js pre-gemini-response-renderer-publish
  n8n publish:workflow --id=case002GeminiResponseRendererV1
  node /opt/case002/backup-n8n-state.js post-gemini-response-renderer-publish

  node /opt/case002/backup-n8n-state.js pre-conversation-agent-v2-import
  n8n import:workflow --input=/opt/case002/conversation-agent-v2.json
  node /opt/case002/backup-n8n-state.js post-conversation-agent-v2-import

  node /opt/case002/backup-n8n-state.js pre-conversation-agent-v2-publish
  n8n publish:workflow --id=case002Level2ConversationAgentV2
  node /opt/case002/backup-n8n-state.js post-conversation-agent-v2-publish

  node /opt/case002/backup-n8n-state.js pre-gemini-poc-receive-overlay
  node /opt/case002/prepare-level2-gemini-poc.js overlay-receive
  node /opt/case002/backup-n8n-state.js post-gemini-poc-receive-overlay

  node /opt/case002/backup-n8n-state.js pre-gemini-poc-publish-receive
  n8n publish:workflow --id=kapsoMessageReceiveV1
  node /opt/case002/backup-n8n-state.js post-gemini-poc-publish-receive

  echo "[case002] Level-2 Gemini conversation PoC prepared"
fi

# CASE-003 additive-only staging. This imports one NEW inactive workflow and never
# publishes it or binds/edits credentials. The persistent n8n state remains authoritative.
if [ "${CASE003_DUE_DATE_IMPORT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003] additive inactive due-date workflow import requested"
  node /opt/case002/backup-n8n-state.js pre-case003-import
  node /opt/case002/verify-case003-import.js pre
  n8n import:workflow --input=/opt/case002/case003-due-date-evaluation.json
  node /opt/case002/verify-case003-import.js post
  node /opt/case002/backup-n8n-state.js post-case003-import
  echo "[case003] import complete; workflow remains inactive and credentials untouched"
fi

# CASE-003 read-only credential metadata inspection. Secret payloads are never read.
if [ "${CASE003_INSPECT_CREDENTIALS_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003] read-only credential metadata inspection requested"
  node /opt/case002/inspect-case003-credentials.js
fi

# CASE-003 Gate 2: create one dedicated RPC credential and replace only the
# CASE-003 workflow definition with the authenticated Supabase RPC overlay.
# Existing credentials and all non-CASE003 workflows are hashed before/after.
if [ "${CASE003_GATE2_RPC_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate2] guarded RPC credential + workflow binding requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate2
  node /opt/case002/verify-case003-gate2.js pre

  trap 'rm -f /tmp/case003-rpc-credential.json' EXIT
  node /opt/case002/prepare-case003-gate2.js
  n8n import:credentials --input=/tmp/case003-rpc-credential.json --projectId="${CASE003_N8N_PROJECT_ID:-Fwp74WQHXQLWzgU2}"
  rm -f /tmp/case003-rpc-credential.json
  trap - EXIT

  n8n import:workflow --input=/opt/case002/case003-due-date-evaluation-rpc.json
  node /opt/case002/verify-case003-gate2.js post
  node /opt/case002/backup-n8n-state.js post-case003-gate2
  echo "[case003-gate2] binding complete; CASE-003 remains inactive and existing state verified unchanged"
fi

# CASE-003 Gate-2 execution proof. Executes only the inactive CASE-003
# workflow via CLI; the workflow has no outbound delivery node.
if [ "${CASE003_GATE2_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate2-test] guarded CLI execution requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate2-test
  node /opt/case002/validate-case003-gate2-execution.js pre
  rm -f /tmp/case003-gate2-cli.log
  set +e
  N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > /tmp/case003-gate2-cli.log 2>&1
  CASE003_CLI_RC=$?
  set -e
  node /opt/case002/validate-case003-gate2-execution.js post
  rm -f /tmp/case003-gate2-cli.log /tmp/case003-gate2-execution-pre.json
  if [ "$CASE003_CLI_RC" -ne 0 ]; then
    echo "[case003-gate2-test] CLI returned non-zero after persisted-result validation: $CASE003_CLI_RC"
    exit "$CASE003_CLI_RC"
  fi
  node /opt/case002/backup-n8n-state.js post-case003-gate2-test
  echo "[case003-gate2-test] execution proof complete"
fi

# CASE-003 Gate 3 binding: replace only the inactive CASE-003 workflow with
# the reservation/idempotency path. Reuse the existing dedicated CASE-003 RPC
# credential without editing any credential payload.
if [ "${CASE003_GATE3_BIND_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate3] guarded reservation workflow binding requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate3-bind
  node /opt/case002/verify-case003-gate3.js pre
  n8n import:workflow --input=/opt/case002/case003-due-date-reservation-gate3.json
  node /opt/case002/verify-case003-gate3.js post
  node /opt/case002/backup-n8n-state.js post-case003-gate3-bind
  rm -f /tmp/case003-gate3-pre.json
  echo "[case003-gate3] binding complete; CASE-003 remains inactive; credentials unchanged"
fi

# CASE-003 Gate 3 execution proof. Execute twice: first execution must reserve
# the synthetic notification; second must return the same reservation with
# reserved=false and be filtered before the delivery payload.
if [ "${CASE003_GATE3_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate3-test] guarded double execution requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate3-test
  node /opt/case002/validate-case003-gate3-execution.js pre

  rm -f /tmp/case003-gate3-first.log /tmp/case003-gate3-second.log
  set +e
  N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > /tmp/case003-gate3-first.log 2>&1
  CASE003_FIRST_RC=$?
  set -e
  node /opt/case002/validate-case003-gate3-execution.js first

  set +e
  N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > /tmp/case003-gate3-second.log 2>&1
  CASE003_SECOND_RC=$?
  set -e
  node /opt/case002/validate-case003-gate3-execution.js second

  rm -f /tmp/case003-gate3-first.log /tmp/case003-gate3-second.log /tmp/case003-gate3-execution.json
  if [ "$CASE003_FIRST_RC" -ne 0 ] || [ "$CASE003_SECOND_RC" -ne 0 ]; then
    echo "[case003-gate3-test] CLI non-zero first=$CASE003_FIRST_RC second=$CASE003_SECOND_RC"
    exit 1
  fi
  node /opt/case002/backup-n8n-state.js post-case003-gate3-test
  echo "[case003-gate3-test] PASS first reserved=true; second reserved=false; duplicate blocked before payload"
fi

# CASE-003 Gate 4 real SAP-report loader. The encrypted payload is supplied
# only through temporary Railway variables and is never committed in plaintext.
# This gate does not mutate n8n workflows or credentials.
if [ "${CASE003_GATE4_IMPORT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate4] guarded real-data load requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate4-load
  node /opt/case002/load-case003-gate4-v2.js
  node /opt/case002/backup-n8n-state.js post-case003-gate4-load
  echo "[case003-gate4] load complete; snapshot remains candidate until control-plane publication"
fi

# CASE-003 Gate 4 binding: replace only CASE-003 with a fresh probe-rule
# workflow for the published real SAP snapshot. Reuses the existing CASE-003
# credential and the Gate-3 state verifier; all non-CASE003 state is immutable.
if [ "${CASE003_GATE4_BIND_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate4] guarded real-SAP workflow binding requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate4-bind
  node /opt/case002/verify-case003-gate3.js pre
  n8n import:workflow --input=/opt/case002/case003-due-date-reservation-gate4.json
  node /opt/case002/verify-case003-gate3.js post
  node /opt/case002/backup-n8n-state.js post-case003-gate4-bind
  rm -f /tmp/case003-gate3-pre.json
  echo "[case003-gate4] binding complete; CASE-003 inactive; credentials unchanged"
fi

# CASE-003 Gate 4 execution proof on the published real SAP-report snapshot.
# The workflow remains inactive and contains no outbound channel node.
if [ "${CASE003_GATE4_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate4-test] guarded real-data double execution requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate4-test
  node /opt/case002/validate-case003-gate4-execution.js pre

  rm -f /tmp/case003-gate4-first.log /tmp/case003-gate4-second.log
  set +e
  N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > /tmp/case003-gate4-first.log 2>&1
  CASE003_GATE4_FIRST_RC=$?
  set -e
  node /opt/case002/validate-case003-gate4-execution.js first

  set +e
  N8N_LOG_OUTPUT=console n8n execute --id=case003DueDateEvaluationV1 --rawOutput > /tmp/case003-gate4-second.log 2>&1
  CASE003_GATE4_SECOND_RC=$?
  set -e
  node /opt/case002/validate-case003-gate4-execution.js second

  rm -f /tmp/case003-gate4-first.log /tmp/case003-gate4-second.log /tmp/case003-gate4-execution.json
  if [ "$CASE003_GATE4_FIRST_RC" -ne 0 ] || [ "$CASE003_GATE4_SECOND_RC" -ne 0 ]; then
    echo "[case003-gate4-test] CLI non-zero first=$CASE003_GATE4_FIRST_RC second=$CASE003_GATE4_SECOND_RC"
    exit 1
  fi
  node /opt/case002/backup-n8n-state.js post-case003-gate4-test
  echo "[case003-gate4-test] PASS real snapshot first reserved=true; second reserved=false; duplicate blocked"
fi

# CASE-003 UI hardening: isolate manual and schedule triggers into separate
# workflows to avoid n8n 2.38.7 partial-execution null-state failures when two
# triggers converge into one downstream path.
if [ "${CASE003_TRIGGER_SPLIT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-split] guarded trigger split requested"
  node /opt/case002/backup-n8n-state.js pre-case003-trigger-split
  node /opt/case002/verify-case003-trigger-split.js pre
  n8n import:workflow --input=/opt/case002/case003-due-date-reservation-gate4-manual.json
  n8n import:workflow --input=/opt/case002/case003-due-date-reservation-gate4-schedule.json
  node /opt/case002/verify-case003-trigger-split.js post
  node /opt/case002/backup-n8n-state.js post-case003-trigger-split
  rm -f /tmp/case003-trigger-split-pre.json
  echo "[case003-split] split complete; both workflows inactive; credentials unchanged"
fi

# CASE-003 Gate 5: additive supplier-query workflow. It remains inactive,
# reuses the dedicated CASE-003 RPC credential, and has no outbound channel.
if [ "${CASE003_GATE5_IMPORT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate5] guarded additive supplier-query import requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate5-import
  node /opt/case002/verify-case003-gate5-import.js pre
  n8n import:workflow --input=/opt/case002/case003-supplier-query-gate5.json
  node /opt/case002/verify-case003-gate5-import.js post
  node /opt/case002/backup-n8n-state.js post-case003-gate5-import
  rm -f /tmp/case003-gate5-pre.json
  echo "[case003-gate5] import complete; workflow inactive; existing state unchanged"
fi

# CASE-003 Gate 5 execution proof: run the inactive manual workflow through CLI,
# validate four access-control decisions and safe response rendering.
if [ "${CASE003_GATE5_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate5-test] guarded supplier-query execution requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate5-test
  rm -f /tmp/case003-gate5-cli.log
  set +e
  N8N_LOG_OUTPUT=console n8n execute --id=case003SupplierQueryGate5V1 --rawOutput > /tmp/case003-gate5-cli.log 2>&1
  CASE003_GATE5_RC=$?
  set -e
  node /opt/case002/validate-case003-gate5-execution.js
  rm -f /tmp/case003-gate5-cli.log
  if [ "$CASE003_GATE5_RC" -ne 0 ]; then
    echo "[case003-gate5-test] CLI non-zero rc=$CASE003_GATE5_RC"
    exit 1
  fi
  node /opt/case002/backup-n8n-state.js post-case003-gate5-test
  echo "[case003-gate5-test] PASS access controls + neutral denial + safe response; outbound disabled"
fi

# CASE-003 Gate 6: additive authenticated channel webhook. Imported
# inactive, reuses the existing CASE-003 RPC credential, and has no outbound send.
if [ "${CASE003_GATE6_IMPORT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate6] guarded additive channel workflow import requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate6-import
  node /opt/case002/verify-case003-gate6-import.js pre
  n8n import:workflow --input=/opt/case002/case003-supplier-channel-gate6.json
  node /opt/case002/verify-case003-gate6-import.js post
  node /opt/case002/backup-n8n-state.js post-case003-gate6-import
  rm -f /tmp/case003-gate6-pre.json
  echo "[case003-gate6] import complete; workflow inactive; existing state unchanged"
fi

# CASE-003 Gate 6 HTTP proof. Temporarily activates ONLY the Gate-6 webhook,
# starts a local n8n HTTP runtime, exercises authenticated ingress/replay/
# verification-init behavior, then deactivates Gate-6 before normal startup.
if [ "${CASE003_GATE6_HTTP_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate6-http] guarded real HTTP ingress proof requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate6-http-test

  n8n update:workflow --id=case003SupplierChannelGate6V1 --active=true

  rm -f /tmp/case003-gate6-server.log
  N8N_LOG_OUTPUT=console n8n start > /tmp/case003-gate6-server.log 2>&1 &
  CASE003_GATE6_PID=$!

  gate6_cleanup() {
    if kill -0 "$CASE003_GATE6_PID" 2>/dev/null; then
      kill "$CASE003_GATE6_PID" 2>/dev/null || true
      wait "$CASE003_GATE6_PID" 2>/dev/null || true
    fi
    n8n update:workflow --id=case003SupplierChannelGate6V1 --active=false >/dev/null 2>&1 || true
  }
  trap gate6_cleanup EXIT INT TERM

  CASE003_GATE6_READY=false
  for i in $(seq 1 40); do
    if node -e "fetch('http://127.0.0.1:5678/healthz',{signal:AbortSignal.timeout(1000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
      CASE003_GATE6_READY=true
      break
    fi
    sleep 1
  done
  if [ "$CASE003_GATE6_READY" != "true" ]; then
    tail -n 80 /tmp/case003-gate6-server.log || true
    echo "[case003-gate6-http] temporary n8n server did not become healthy"
    exit 1
  fi

  CASE003_GATE6_BASE_URL=http://127.0.0.1:5678 node /opt/case002/test-case003-gate6-http.js

  gate6_cleanup
  trap - EXIT INT TERM
  rm -f /tmp/case003-gate6-server.log

  node - <<'NODE'
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const db=new sqlite3.Database(process.env.DB_SQLITE_DATABASE||'/home/node/.n8n/database.sqlite',sqlite3.OPEN_READONLY);
db.get("select active from workflow_entity where id='case003SupplierChannelGate6V1'",(e,r)=>{
  db.close();
  if(e) throw e;
  if(!r || !(r.active===0||r.active===false||r.active==='0')) throw new Error('Gate-6 workflow not inactive after HTTP proof');
  console.log('[case003-gate6-http] FINAL workflow inactive=true');
});
NODE

  node /opt/case002/backup-n8n-state.js post-case003-gate6-http-test
  echo "[case003-gate6-http] PASS authenticated HTTP ingress + replay + verification-init; outbound disabled"
fi


# CASE-003 Gate 7: additive signed Kapso provider adapter. The workflow is
# rendered with the existing live Kapso HMAC credential binding and the
# existing CASE-003 RPC credential; no credential payload is modified.
if [ "${CASE003_GATE7_IMPORT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate7] guarded additive Kapso ingress import requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate7-import
  node /opt/case002/verify-case003-gate7-import.js pre
  node /opt/case002/prepare-case003-gate7.js
  n8n import:workflow --input=/tmp/case003-kapso-ingress-gate7.json
  rm -f /tmp/case003-kapso-ingress-gate7.json
  node /opt/case002/verify-case003-gate7-import.js post
  node /opt/case002/backup-n8n-state.js post-case003-gate7-import
  rm -f /tmp/case003-gate7-pre.json
  echo "[case003-gate7] import complete; target inactive; CASE-002 receive and credentials unchanged"
fi

# CASE-003 Gate 7 signed provider proof. Temporarily activates only the new
# CASE-003 Kapso adapter, sends synthetic Kapso-shaped payloads signed with
# the already-stored live HMAC secret, then restores the target to inactive.
if [ "${CASE003_GATE7_HTTP_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate7-http] guarded signed Kapso HTTP proof requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate7-http-test
  node /opt/case002/verify-case003-gate7-test.js pre

  n8n update:workflow --id=case003KapsoIngressGate7V1 --active=true

  rm -f /tmp/case003-gate7-server.log
  N8N_LOG_OUTPUT=console n8n start > /tmp/case003-gate7-server.log 2>&1 &
  CASE003_GATE7_PID=$!

  gate7_cleanup() {
    if kill -0 "$CASE003_GATE7_PID" 2>/dev/null; then
      kill "$CASE003_GATE7_PID" 2>/dev/null || true
      wait "$CASE003_GATE7_PID" 2>/dev/null || true
    fi
    n8n update:workflow --id=case003KapsoIngressGate7V1 --active=false >/dev/null 2>&1 || true
  }
  trap gate7_cleanup EXIT INT TERM

  CASE003_GATE7_READY=false
  for i in $(seq 1 40); do
    if node -e "fetch('http://127.0.0.1:5678/healthz',{signal:AbortSignal.timeout(1000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
      CASE003_GATE7_READY=true
      break
    fi
    sleep 1
  done
  if [ "$CASE003_GATE7_READY" != "true" ]; then
    tail -n 100 /tmp/case003-gate7-server.log || true
    echo "[case003-gate7-http] temporary n8n server did not become healthy"
    exit 1
  fi

  CASE003_GATE7_BASE_URL=http://127.0.0.1:5678 node /opt/case002/test-case003-gate7-http.js

  gate7_cleanup
  trap - EXIT INT TERM
  rm -f /tmp/case003-gate7-server.log
  node /opt/case002/verify-case003-gate7-test.js post
  rm -f /tmp/case003-gate7-test-pre.json
  node /opt/case002/backup-n8n-state.js post-case003-gate7-http-test
  echo "[case003-gate7-http] PASS signed Kapso ingress + replay + connector binding + signature rejection; outbound disabled"
fi

# CASE-003 Gate 9: additive verified-identity provider workflow.
# Imported inactive, reuses existing HMAC + CASE-003 RPC credentials, and
# contains no WhatsApp/email outbound node.
if [ "${CASE003_GATE9_IMPORT_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate9] guarded additive verification workflow import requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate9-import
  node /opt/case002/verify-case003-gate9-import.js pre
  node /opt/case002/prepare-case003-gate9.js
  n8n import:workflow --input=/tmp/case003-kapso-verification-gate9.json
  rm -f /tmp/case003-kapso-verification-gate9.json
  node /opt/case002/verify-case003-gate9-import.js post
  node /opt/case002/backup-n8n-state.js post-case003-gate9-import
  rm -f /tmp/case003-gate9-pre.json
  echo "[case003-gate9] import complete; target inactive; existing state unchanged"
fi

# CASE-003 Gate 9 provider preparation: create an isolated inactive
# Kapso webhook for the verification workflow. CASE-002 stays active.
if [ "${CASE003_GATE9_PREPARE_KAPSO_WEBHOOK_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate9-webhook] guarded inactive Kapso webhook preparation requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate9-webhook-prepare
  node /opt/case002/prepare-case003-gate9-kapso-webhook.js
  node /opt/case002/backup-n8n-state.js post-case003-gate9-webhook-prepare
fi

# CASE-003 Gate 9: arm the isolated verification provider path.
# This only receives/validates messages; WhatsApp and email outbound remain disabled.
if [ "${CASE003_GATE9_ARM_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate9-arm] guarded real-provider verification arm requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate9-arm
  node /opt/case002/arm-case003-gate9.js
  node /opt/case002/backup-n8n-state.js post-case003-gate9-arm
fi

# CASE-003 Gate 9 cleanup after real-provider verification tests.
if [ "${CASE003_GATE9_DISARM_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate9-disarm] guarded verification cleanup requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate9-disarm
  node /opt/case002/disarm-case003-gate9.js
  node /opt/case002/backup-n8n-state.js post-case003-gate9-disarm
fi


# CASE-003 Gate 10 one-shot SMTP delivery proof. It renders the real test
# destination only into /tmp, executes with persisted execution saving disabled,
# then immediately re-imports a scrubbed inactive workflow.
if [ "${CASE003_GATE10_SMTP_TEST_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate10] guarded SMTP delivery proof requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate10-smtp-test
  umask 077

  node /opt/case002/prepare-case003-gate10-smtp-test.js render
  n8n import:workflow --input=/tmp/case003-gate10-smtp-test.json

  rm -f /tmp/case003-gate10-cli.log
  set +e
  N8N_LOG_OUTPUT=console n8n execute --id=case003Gate10SmtpTestV1 --rawOutput > /tmp/case003-gate10-cli.log 2>&1
  CASE003_GATE10_RC=$?
  set -e

  node /opt/case002/prepare-case003-gate10-smtp-test.js scrub
  n8n import:workflow --input=/tmp/case003-gate10-smtp-test.json

  rm -f /tmp/case003-gate10-smtp-test.json /tmp/case003-gate10-cli.log
  node /opt/case002/backup-n8n-state.js post-case003-gate10-smtp-test

  if [ "$CASE003_GATE10_RC" -ne 0 ]; then
    echo "[case003-gate10] SMTP workflow execution returned non-zero rc=$CASE003_GATE10_RC"
    exit "$CASE003_GATE10_RC"
  fi
  echo "[case003-gate10] SMTP workflow execution completed; verify durable delivery state"
fi

# CASE-003: one-shot READ-ONLY Kapso account discovery.
# Uses the existing KAPSO API credential, lists phone-number/webhook metadata,
# logs no credential secret values, performs no provider mutation.
if [ "${CASE003_KAPSO_DISCOVERY_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-kapso-discovery] read-only discovery requested"
  node /opt/case002/inspect-case003-kapso-account.js
fi

# CASE-003 Gate 8 preparation: create a SECOND inactive Kapso webhook
# for CASE-003 using existing KAPSO API + HMAC credentials. Existing CASE-002
# webhook must remain untouched and active.
if [ "${CASE003_GATE8_PREPARE_KAPSO_WEBHOOK_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate8-prepare] guarded Kapso webhook preparation requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate8-prepare
  node /opt/case002/prepare-case003-gate8-kapso-webhook.js
  node /opt/case002/backup-n8n-state.js post-case003-gate8-prepare
fi

# CASE-003 Gate 8: arm the isolated CASE-003 Kapso webhook for a
# real WhatsApp-originated receive proof. No outbound send node exists.
if [ "${CASE003_GATE8_ARM_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate8-arm] guarded real-provider arm requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate8-arm
  node /opt/case002/arm-case003-gate8.js
  node /opt/case002/backup-n8n-state.js post-case003-gate8-arm
fi

# CASE-003 Gate 8 post-proof cleanup: deactivate only the isolated
# CASE-003 provider webhook/workflow; keep CASE-002 live.
if [ "${CASE003_GATE8_DISARM_ON_STARTUP:-false}" = "true" ]; then
  echo "[case003-gate8-disarm] guarded post-proof cleanup requested"
  node /opt/case002/backup-n8n-state.js pre-case003-gate8-disarm
  node /opt/case002/disarm-case003-gate8.js
  node /opt/case002/backup-n8n-state.js post-case003-gate8-disarm
fi

echo "[case002] bootstrap complete; starting n8n"
exec n8n start
