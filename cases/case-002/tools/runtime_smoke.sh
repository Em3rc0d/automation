#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
COMPOSE="$ROOT/factory/runtime/compose.yml"
export N8N_VERSION="${N8N_VERSION:-2.38.7}"

cleanup() {
  docker compose -f "$COMPOSE" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [[ "$N8N_VERSION" == "latest" ]]; then
  echo "CASE-002 RUNTIME REFUSED: latest is forbidden"
  exit 2
fi

echo "[case-002] static readiness"
python "$ROOT/cases/case-002/tools/validate_readiness.py"

echo "[case-002] deterministic acceptance fixtures"
python "$ROOT/cases/case-002/tools/run_acceptance.py"

echo "[case-002] validate compose"
docker compose -f "$COMPOSE" config >/dev/null

echo "[case-002] start pinned n8n=$N8N_VERSION + mock control plane"
docker compose -f "$COMPOSE" up -d --wait
curl --fail --silent --show-error http://127.0.0.1:5678/healthz >/dev/null

echo "[case-002] verify pinned runtime"
RUNTIME_VERSION="$(docker compose -f "$COMPOSE" exec -T n8n n8n --version | tr -d '\r')"
if [[ "$RUNTIME_VERSION" != "$N8N_VERSION" ]]; then
  echo "CASE-002 RUNTIME REFUSED: expected $N8N_VERSION got $RUNTIME_VERSION"
  exit 2
fi

for pkg in \
  KAPSO_MESSAGE_RECEIVE@1.0 \
  KAPSO_MEDIA_DOWNLOAD@1.0 \
  KAPSO_MESSAGE_SEND@1.0; do
  rel="quarries/workflow-quarry/30-hardened/adapters/messaging/$pkg/workflow.json"
  echo "[case-002] import $rel"
  docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input="/workspace/$rel" </dev/null
done

echo "[case-002] import Level-2 media evidence composition"
docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input=/workspace/cases/case-002/workflows/CASE002_LEVEL2_MEDIA_EVIDENCE@1.0/workflow.json </dev/null

echo "[case-002] import Level-2 appointment agent"
docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input=/workspace/cases/case-002/workflows/CASE002_LEVEL2_APPOINTMENT_AGENT@1.0/workflow.json </dev/null

echo "[case-002] import acceptance probe"
docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input=/workspace/cases/case-002/runtime/case002-acceptance-probe.json </dev/null

echo "[case-002] stop server for exclusive CLI execution"
docker compose -f "$COMPOSE" stop n8n

echo "[case-002] execute acceptance probe"
docker compose -f "$COMPOSE" run --rm --no-deps n8n execute --id=case002AcceptanceProbeV1 </dev/null

echo "CASE-002 RUNTIME SMOKE: PASS"
echo "Boundary: Kapso adapters + Level-2 media evidence + Level-2 appointment agent imported; case acceptance executed with mocked providers."
