FROM n8nio/n8n:2.38.7

# CASE-002 runtime marker: backup law helper must be present in every live image.
USER root
RUN mkdir -p /opt/case002
COPY quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_RECEIVE@1.0/workflow.json /opt/case002/kapso-receive.json
COPY quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MEDIA_DOWNLOAD@1.0/workflow.json /opt/case002/kapso-media.json
COPY quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_SEND@1.0/workflow.json /opt/case002/kapso-send.json
COPY cases/case-002/workflows/CASE002_LEVEL2_APPOINTMENT_AGENT@1.0/workflow.json /opt/case002/appointment-agent.json
COPY cases/case-002/workflows/CASE002_GEMINI_INTERPRETER@1.0/workflow.json /opt/case002/gemini-interpreter.json
COPY cases/case-002/workflows/CASE002_GEMINI_RESPONSE_RENDERER@1.0/workflow.json /opt/case002/gemini-response-renderer.json
COPY cases/case-002/workflows/CASE002_LEVEL2_CONVERSATION_AGENT@2.0/workflow.json /opt/case002/conversation-agent-v2.json
COPY cases/case-002/runtime/case002-acceptance-probe.json /opt/case002/acceptance-probe.json
COPY cases/case-002/runtime/live/control-plane-stub.json /opt/case002/control-plane-stub.json
COPY cases/case-002/runtime/case003/due-date-evaluation.json /opt/case002/case003-due-date-evaluation.json
COPY cases/case-002/runtime/railway/recover-workflows.js /opt/case002/recover-workflows.js
COPY cases/case-002/runtime/railway/backup-n8n-state.js /opt/case002/backup-n8n-state.js
COPY cases/case-002/runtime/railway/prepare-level2-reply-test.js /opt/case002/prepare-level2-reply-test.js
COPY cases/case-002/runtime/railway/prepare-level2-appointment-agent.js /opt/case002/prepare-level2-appointment-agent.js
COPY cases/case-002/runtime/railway/prepare-level2-gemini-poc.js /opt/case002/prepare-level2-gemini-poc.js
COPY cases/case-002/runtime/railway/verify-case003-import.js /opt/case002/verify-case003-import.js
COPY cases/case-002/runtime/railway/entrypoint.sh /opt/case002/entrypoint.sh
RUN chmod 755 /opt/case002/entrypoint.sh /opt/case002/recover-workflows.js /opt/case002/backup-n8n-state.js /opt/case002/prepare-level2-reply-test.js /opt/case002/prepare-level2-appointment-agent.js /opt/case002/prepare-level2-gemini-poc.js /opt/case002/verify-case003-import.js && chown -R node:node /opt/case002
USER node

ENTRYPOINT ["/opt/case002/entrypoint.sh"]
