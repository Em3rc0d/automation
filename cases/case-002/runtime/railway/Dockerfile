FROM n8nio/n8n:2.38.7

USER root
RUN mkdir -p /opt/case002
COPY quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_RECEIVE@1.0/workflow.json /opt/case002/kapso-receive.json
COPY quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MEDIA_DOWNLOAD@1.0/workflow.json /opt/case002/kapso-media.json
COPY quarries/workflow-quarry/30-hardened/adapters/messaging/KAPSO_MESSAGE_SEND@1.0/workflow.json /opt/case002/kapso-send.json
COPY cases/case-002/runtime/case002-acceptance-probe.json /opt/case002/acceptance-probe.json
COPY cases/case-002/runtime/live/control-plane-stub.json /opt/case002/control-plane-stub.json
COPY cases/case-002/runtime/railway/recover-workflows.js /opt/case002/recover-workflows.js
COPY cases/case-002/runtime/railway/backup-n8n-state.js /opt/case002/backup-n8n-state.js
COPY cases/case-002/runtime/railway/entrypoint.sh /opt/case002/entrypoint.sh
RUN chmod 755 /opt/case002/entrypoint.sh /opt/case002/recover-workflows.js /opt/case002/backup-n8n-state.js && chown -R node:node /opt/case002
USER node

ENTRYPOINT ["/opt/case002/entrypoint.sh"]
