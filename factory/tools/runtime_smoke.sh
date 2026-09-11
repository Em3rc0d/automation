#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="$ROOT/factory/runtime/compose.yml"
export N8N_VERSION="${N8N_VERSION:-2.38.7}"

cleanup() {
  docker compose -f "$COMPOSE" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [[ "$N8N_VERSION" == "latest" ]]; then
  echo "FACTORY RUNTIME REFUSED: latest is forbidden"
  exit 2
fi

echo "[factory] validating compose"
docker compose -f "$COMPOSE" config >/dev/null

echo "[factory] starting pinned n8n=$N8N_VERSION and mock control plane"
docker compose -f "$COMPOSE" up -d --wait

echo "[factory] checking n8n health"
curl --fail --silent --show-error http://127.0.0.1:5678/healthz >/dev/null

echo "[factory] checking mock reachability from n8n network"
docker compose -f "$COMPOSE" exec -T n8n wget -qO- http://mock-control-plane:8080/healthz | grep -q 'ok'

echo "[factory] verifying runtime version"
RUNTIME_VERSION="$(docker compose -f "$COMPOSE" exec -T n8n n8n --version | tr -d '\r')"
echo "[factory] runtime reports: $RUNTIME_VERSION"
if [[ "$RUNTIME_VERSION" != "$N8N_VERSION" ]]; then
  echo "FACTORY RUNTIME REFUSED: expected $N8N_VERSION got $RUNTIME_VERSION"
  exit 2
fi

echo "[factory] importing runtime probe"
docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input=/workspace/factory/probes/runtime-probe.json </dev/null

echo "[factory] discovering every HARDENED candidate"
mapfile -d '' HARDENED_WORKFLOWS < <(
  find "$ROOT/quarries/workflow-quarry/30-hardened" -type f -name workflow.json -print0 | sort -z
)
expected="${#HARDENED_WORKFLOWS[@]}"
if [[ "$expected" -lt 1 ]]; then
  echo "FACTORY RUNTIME REFUSED: no HARDENED candidates found"
  exit 2
fi

echo "[factory] HARDENED candidates discovered: $expected"
count=0
for workflow in "${HARDENED_WORKFLOWS[@]}"; do
  rel="${workflow#"$ROOT/"}"
  echo "[factory] import $rel"
  docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input="/workspace/$rel" </dev/null
  count=$((count + 1))
done

if [[ "$count" -ne "$expected" ]]; then
  echo "FACTORY RUNTIME REFUSED: discovered=$expected imported=$count"
  exit 2
fi

echo "[factory] imported HARDENED candidates: $count/$expected"

echo "[factory] stop server before direct CLI execution against same database"
docker compose -f "$COMPOSE" stop n8n

echo "[factory] executing runtime probe"
docker compose -f "$COMPOSE" run --rm --no-deps n8n execute --id=factoryRuntimeProbeV1 </dev/null

echo "FACTORY RUNTIME SMOKE: PASS"
