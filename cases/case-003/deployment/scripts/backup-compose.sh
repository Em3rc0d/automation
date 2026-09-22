#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR:-$ROOT/backups}/$STAMP"
mkdir -p "$OUT"
chmod 700 "$OUT"

set -a
# shellcheck disable=SC1091
. ./.env
set +a

echo "[backup] writing $OUT"

docker compose exec -T n8n-db pg_dump   -U "${N8N_DB_USER:-n8n}"   -d "${N8N_DB_NAME:-n8n}"   -Fc > "$OUT/n8n-postgres.dump"

# This archive is for filesystem/binary/config state. Database consistency is
# provided separately by pg_dump. It intentionally does not decrypt credentials.
docker compose exec -T n8n sh -c 'tar -czf - -C /home/node/.n8n .' > "$OUT/n8n-data.tgz"

{
  echo "created_at_utc=$STAMP"
  echo "n8n_version=${N8N_VERSION:-unknown}"
  echo "git_commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
  echo "contains_decrypted_credentials=false"
} > "$OUT/metadata.txt"

(
  cd "$OUT"
  sha256sum n8n-postgres.dump n8n-data.tgz metadata.txt > SHA256SUMS
)
chmod 600 "$OUT"/*

echo "[backup] PASS $OUT"
