#!/usr/bin/env bash
set -euo pipefail

for migration in /case001-migrations/*.sql; do
  echo "Applying CASE-001 migration: ${migration}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
done
