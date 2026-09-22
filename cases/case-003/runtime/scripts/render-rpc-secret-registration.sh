#!/bin/sh
set -eu
: "${CASE003_RPC_TOKEN:?CASE003_RPC_TOKEN required}"
HASH="$(printf '%s' "$CASE003_RPC_TOKEN" | sha256sum | awk '{print $1}')"
cat <<SQL
insert into case003.integration_secret(integration_key,secret_sha256,rotated_at)
values ('due_candidates_rpc','$HASH',now())
on conflict (integration_key) do update
set secret_sha256=excluded.secret_sha256, rotated_at=excluded.rotated_at;
SQL
