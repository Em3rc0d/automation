#!/bin/sh
set -eu

set -- /case001-migrations/*.sql
if [ ! -e "$1" ]; then
  echo "No CASE-001 migrations found under /case001-migrations." >&2
  exit 1
fi

for migration in "$@"; do
  echo "Applying CASE-001 migration: ${migration}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
done
