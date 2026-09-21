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
COPY cases/case-002/runtime/case003/due-date-evaluation-supabase-rpc.json /opt/case002/case003-due-date-evaluation-rpc.json
COPY cases/case-002/runtime/case003/due-date-reservation-gate3.json /opt/case002/case003-due-date-reservation-gate3.json
COPY cases/case-002/runtime/case003/due-date-reservation-gate4.json /opt/case002/case003-due-date-reservation-gate4.json
COPY cases/case-002/runtime/case003/due-date-reservation-gate4-manual.json /opt/case002/case003-due-date-reservation-gate4-manual.json
COPY cases/case-002/runtime/case003/due-date-reservation-gate4-schedule.json /opt/case002/case003-due-date-reservation-gate4-schedule.json
COPY cases/case-002/runtime/case003/supplier-query-gate5.json /opt/case002/case003-supplier-query-gate5.json
COPY cases/case-002/runtime/case003/supplier-channel-gate6.json /opt/case002/case003-supplier-channel-gate6.json
COPY cases/case-002/runtime/railway/recover-workflows.js /opt/case002/recover-workflows.js
COPY cases/case-002/runtime/railway/backup-n8n-state.js /opt/case002/backup-n8n-state.js
COPY cases/case-002/runtime/railway/prepare-level2-reply-test.js /opt/case002/prepare-level2-reply-test.js
COPY cases/case-002/runtime/railway/prepare-level2-appointment-agent.js /opt/case002/prepare-level2-appointment-agent.js
COPY cases/case-002/runtime/railway/prepare-level2-gemini-poc.js /opt/case002/prepare-level2-gemini-poc.js
COPY cases/case-002/runtime/railway/verify-case003-import.js /opt/case002/verify-case003-import.js
COPY cases/case-002/runtime/railway/inspect-case003-credentials.js /opt/case002/inspect-case003-credentials.js
COPY cases/case-002/runtime/railway/prepare-case003-gate2.js /opt/case002/prepare-case003-gate2.js
COPY cases/case-002/runtime/railway/verify-case003-gate2.js /opt/case002/verify-case003-gate2.js
COPY cases/case-002/runtime/railway/validate-case003-gate2-execution.js /opt/case002/validate-case003-gate2-execution.js
COPY cases/case-002/runtime/railway/verify-case003-gate3.js /opt/case002/verify-case003-gate3.js
COPY cases/case-002/runtime/railway/validate-case003-gate3-execution.js /opt/case002/validate-case003-gate3-execution.js
COPY cases/case-002/runtime/railway/import-case003-gate4.js /opt/case002/import-case003-gate4.js
COPY cases/case-002/runtime/railway/load-case003-gate4.js /opt/case002/load-case003-gate4.js
COPY cases/case-002/runtime/railway/load-case003-gate4-v2.js /opt/case002/load-case003-gate4-v2.js
COPY cases/case-002/runtime/railway/validate-case003-gate4-execution.js /opt/case002/validate-case003-gate4-execution.js
COPY cases/case-002/runtime/railway/verify-case003-trigger-split.js /opt/case002/verify-case003-trigger-split.js
COPY cases/case-002/runtime/railway/verify-case003-gate5-import.js /opt/case002/verify-case003-gate5-import.js
COPY cases/case-002/runtime/railway/validate-case003-gate5-execution.js /opt/case002/validate-case003-gate5-execution.js
COPY cases/case-002/runtime/railway/verify-case003-gate6-import.js /opt/case002/verify-case003-gate6-import.js
COPY cases/case-002/runtime/railway/test-case003-gate6-http.js /opt/case002/test-case003-gate6-http.js
COPY cases/case-002/runtime/railway/entrypoint.sh /opt/case002/entrypoint.sh
RUN chmod 755 /opt/case002/entrypoint.sh /opt/case002/recover-workflows.js /opt/case002/backup-n8n-state.js /opt/case002/prepare-level2-reply-test.js /opt/case002/prepare-level2-appointment-agent.js /opt/case002/prepare-level2-gemini-poc.js /opt/case002/verify-case003-import.js /opt/case002/inspect-case003-credentials.js /opt/case002/prepare-case003-gate2.js /opt/case002/verify-case003-gate2.js /opt/case002/validate-case003-gate2-execution.js /opt/case002/verify-case003-gate3.js /opt/case002/validate-case003-gate3-execution.js /opt/case002/load-case003-gate4.js /opt/case002/load-case003-gate4-v2.js /opt/case002/validate-case003-gate4-execution.js /opt/case002/verify-case003-trigger-split.js /opt/case002/verify-case003-gate5-import.js /opt/case002/validate-case003-gate5-execution.js /opt/case002/verify-case003-gate6-import.js /opt/case002/test-case003-gate6-http.js && chown -R node:node /opt/case002
USER node

ENTRYPOINT ["/opt/case002/entrypoint.sh"]
