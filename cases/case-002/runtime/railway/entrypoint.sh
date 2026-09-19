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

echo "[case002] bootstrap complete; starting n8n"
exec n8n start
