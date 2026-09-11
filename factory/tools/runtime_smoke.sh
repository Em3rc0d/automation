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

if [[ -f "$ROOT/waves/catalog.py" ]]; then
  echo "[waves] compile deterministic W3-W11 candidates and probes"
  python "$ROOT/waves/tools/build_waves.py"
  python "$ROOT/waves/tools/normalize_probe_fixtures.py"
  python "$ROOT/waves/tools/validate_waves.py"
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

echo "[factory] discovering every committed HARDENED candidate"
mapfile -d '' HARDENED_WORKFLOWS < <(
  find "$ROOT/quarries/workflow-quarry/30-hardened" -type f -name workflow.json -print0 | sort -z
)
expected="${#HARDENED_WORKFLOWS[@]}"
if [[ "$expected" -lt 1 ]]; then
  echo "FACTORY RUNTIME REFUSED: no HARDENED candidates found"
  exit 2
fi

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
echo "[factory] imported committed HARDENED candidates: $count/$expected"

WAVE_PROBE_IDS=""
if [[ -d "$ROOT/waves/.generated/candidates" ]]; then
  echo "[waves] importing 99 generated W3-W11 production candidates"
  wave_candidates=0
  while IFS= read -r -d '' workflow; do
    rel="${workflow#"$ROOT/"}"
    docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input="/workspace/$rel" </dev/null
    wave_candidates=$((wave_candidates + 1))
  done < <(find "$ROOT/waves/.generated/candidates" -type f -name workflow.json -print0 | sort -z)
  if [[ "$wave_candidates" -ne 99 ]]; then
    echo "WAVES RUNTIME REFUSED: expected 99 candidates, imported $wave_candidates"
    exit 2
  fi

  echo "[waves] importing 198 executable domain probes"
  wave_probes=0
  while IFS= read -r -d '' probe; do
    rel="${probe#"$ROOT/"}"
    docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --input="/workspace/$rel" </dev/null
    wave_probes=$((wave_probes + 1))
  done < <(find "$ROOT/waves/.generated/runtime-probes" -type f -name '*.json' -print0 | sort -z)
  if [[ "$wave_probes" -ne 198 ]]; then
    echo "WAVES RUNTIME REFUSED: expected 198 probes, imported $wave_probes"
    exit 2
  fi
  WAVE_PROBE_IDS="$(python "$ROOT/waves/tools/probe_ids.py")"
fi

echo "[factory] stop server before direct CLI execution against same database"
docker compose -f "$COMPOSE" stop n8n

echo "[factory] executing runtime probe"
docker compose -f "$COMPOSE" run --rm --no-deps n8n execute --id=factoryRuntimeProbeV1 </dev/null

if [[ -n "$WAVE_PROBE_IDS" ]]; then
  echo "[waves] executing W3-W11 runtime/domain matrix with n8n execute-batch"
  docker compose -f "$COMPOSE" run --rm --no-deps \
    -e WAVE_PROBE_IDS="$WAVE_PROBE_IDS" \
    --entrypoint /bin/sh n8n -lc '
      set -eu
      printf "%s" "$WAVE_PROBE_IDS" | tr " " "," > /tmp/wave-probe-ids.csv
      n8n execute-batch \
        --ids=/tmp/wave-probe-ids.csv \
        --concurrency=4 \
        --retries=0 \
        --output=/tmp/wave-batch-results.json
      node - <<"NODE"
const fs = require("fs");
const p = "/tmp/wave-batch-results.json";
if (!fs.existsSync(p)) throw new Error("WAVES_BATCH_RESULT_MISSING");
const r = JSON.parse(fs.readFileSync(p, "utf8"));
const s = r.summary || {};
if (r.totalWorkflows !== 198) throw new Error(`WAVES_BATCH_COUNT expected=198 actual=${r.totalWorkflows}`);
if (s.successfulExecutions !== 198) throw new Error(`WAVES_BATCH_SUCCESS expected=198 actual=${s.successfulExecutions}`);
if ((s.failedExecutions || 0) !== 0) throw new Error(`WAVES_BATCH_FAILURES actual=${s.failedExecutions}`);
if ((s.warningExecutions || 0) !== 0) throw new Error(`WAVES_BATCH_WARNINGS actual=${s.warningExecutions}`);
const assertCovered = (r.coveredNodes || {})["Assert Domain Decision"] || 0;
if (assertCovered < 198) throw new Error(`WAVES_ASSERT_COVERAGE expected>=198 actual=${assertCovered}`);
console.log(`W3-W11 RUNTIME MATRIX: PASS probes=${s.successfulExecutions} assertions=${assertCovered}`);
NODE
    '
fi

echo "FACTORY RUNTIME SMOKE: PASS"
