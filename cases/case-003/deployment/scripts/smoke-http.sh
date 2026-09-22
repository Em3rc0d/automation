#!/usr/bin/env sh
set -eu

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

BASE="${N8N_PUBLIC_URL:-https://${N8N_FQDN:-}}"
[ -n "$BASE" ] || { echo "[smoke] N8N_PUBLIC_URL or N8N_FQDN required" >&2; exit 1; }

echo "[smoke] checking $BASE"
curl -fsSIL --max-time 15 "$BASE/" >/dev/null
echo "[smoke] PASS public HTTP/TLS"

# Provider/business smoke tests require credentials and should be executed
# through the CASE-003 gate-specific scripts/evidence, not from this generic probe.
