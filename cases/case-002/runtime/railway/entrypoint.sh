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

echo "[case002] bootstrap complete; starting n8n"
exec n8n start
