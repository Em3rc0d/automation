ARG N8N_VERSION=2.38.7
FROM n8nio/n8n:${N8N_VERSION}

USER root
RUN mkdir -p /opt/case003
COPY cases/case-003/runtime /opt/case003/runtime
COPY cases/case-003/build /opt/case003/build
COPY cases/case-003/deployment/railway/entrypoint.sh /opt/case003/entrypoint.sh
RUN chmod 755 /opt/case003/entrypoint.sh && chown -R node:node /opt/case003
USER node

ENTRYPOINT ["/opt/case003/entrypoint.sh"]
