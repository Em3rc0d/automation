#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SRC="${1:-}"
[ -n "$SRC" ] || { echo "usage: ALLOW_RESTORE=YES $0 <backup-directory>" >&2; exit 2; }
[ "${ALLOW_RESTORE:-NO}" = "YES" ] || { echo "[restore] refusing destructive restore without ALLOW_RESTORE=YES" >&2; exit 2; }
[ -f "$SRC/n8n-postgres.dump" ] || { echo "[restore] missing n8n-postgres.dump" >&2; exit 2; }
[ -f "$SRC/n8n-data.tgz" ] || { echo "[restore] missing n8n-data.tgz" >&2; exit 2; }
[ -f "$SRC/SHA256SUMS" ] || { echo "[restore] missing SHA256SUMS" >&2; exit 2; }

(
  cd "$SRC"
  sha256sum -c SHA256SUMS
)

set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "[restore] creating mandatory pre-restore backup"
"$ROOT/scripts/backup-compose.sh"

echo "[restore] stopping n8n"
docker compose stop n8n

echo "[restore] restoring n8n PostgreSQL"
docker compose exec -T n8n-db pg_restore   -U "${N8N_DB_USER:-n8n}"   -d "${N8N_DB_NAME:-n8n}"   --clean --if-exists --no-owner < "$SRC/n8n-postgres.dump"

echo "[restore] restoring /home/node/.n8n filesystem state"
docker compose run --rm --no-deps --entrypoint sh n8n -c   'find /home/node/.n8n -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +; tar -xzf - -C /home/node/.n8n'   < "$SRC/n8n-data.tgz"

echo "[restore] starting stack"
docker compose up -d

echo "[restore] restore complete; run scripts/smoke-http.sh and CASE-003 gate smoke tests before provider cutover"
