#!/usr/bin/env sh
set -eu

fail() { echo "[preflight] FAIL: $*" >&2; exit 1; }
ok() { echo "[preflight] OK: $*"; }

command -v docker >/dev/null 2>&1 || fail "docker not found"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin not found"
command -v curl >/dev/null 2>&1 || fail "curl not found"
command -v openssl >/dev/null 2>&1 || fail "openssl not found"

[ -f .env ] || fail ".env missing; copy .env.example and fill it"
[ -f Caddyfile ] || fail "Caddyfile missing; copy Caddyfile.example"

set -a
# shellcheck disable=SC1091
. ./.env
set +a

[ -n "${N8N_FQDN:-}" ] || fail "N8N_FQDN missing"
[ -n "${N8N_ENCRYPTION_KEY:-}" ] || fail "N8N_ENCRYPTION_KEY missing"
[ "${N8N_ENCRYPTION_KEY}" != "CHANGE_ME_LONG_RANDOM_SECRET" ] || fail "replace N8N_ENCRYPTION_KEY placeholder"
[ -n "${N8N_DB_PASSWORD:-}" ] || fail "N8N_DB_PASSWORD missing"
[ "${N8N_DB_PASSWORD}" != "CHANGE_ME_DB_SECRET" ] || fail "replace DB password placeholder"

case "${N8N_VERSION:-}" in
  latest|"") fail "N8N_VERSION must be pinned" ;;
  *) ok "n8n version pinned to ${N8N_VERSION}" ;;
esac

case "${GENERIC_TIMEZONE:-America/Lima}" in
  America/Lima) ok "timezone America/Lima" ;;
  *) echo "[preflight] WARN: timezone is ${GENERIC_TIMEZONE}" ;;
esac

if getent hosts "${N8N_FQDN}" >/dev/null 2>&1; then
  ok "DNS resolves for ${N8N_FQDN}"
else
  echo "[preflight] WARN: DNS does not resolve yet for ${N8N_FQDN}"
fi

docker compose config >/dev/null || fail "docker compose config invalid"
ok "compose configuration parses"

echo "[preflight] PASS"
