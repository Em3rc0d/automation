#!/bin/sh
set -eu

: "${N8N_ENCRYPTION_KEY:?N8N_ENCRYPTION_KEY is required}"

export N8N_USER_FOLDER="${N8N_USER_FOLDER:-/home/node}"
export N8N_PORT="${N8N_PORT:-${PORT:-5678}}"
export GENERIC_TIMEZONE="${GENERIC_TIMEZONE:-America/Lima}"
export TZ="${TZ:-${GENERIC_TIMEZONE}}"

if [ -z "${N8N_HOST:-}" ] && [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
  export N8N_HOST="${RAILWAY_PUBLIC_DOMAIN}"
fi

if [ -n "${N8N_HOST:-}" ]; then
  export N8N_PROTOCOL="${N8N_PROTOCOL:-https}"
  export WEBHOOK_URL="${WEBHOOK_URL:-https://${N8N_HOST}/}"
  export N8N_EDITOR_BASE_URL="${N8N_EDITOR_BASE_URL:-https://${N8N_HOST}/}"
fi

echo "[case003] portable Railway bootstrap"
echo "[case003] n8n version: $(n8n --version)"
echo "[case003] user folder: ${N8N_USER_FOLDER}"
echo "[case003] listen port: ${N8N_PORT}"
echo "[case003] timezone: ${GENERIC_TIMEZONE}"
echo "[case003] secrets are intentionally not printed"

exec n8n start
