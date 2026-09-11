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

  echo "[waves] stage flat bulk-import directories"
  python - "$ROOT" <<'PY'
from __future__ import annotations
import json, shutil, sys
from pathlib import Path
root = Path(sys.argv[1])
generated = root / "waves/.generated"
for name in ("bulk-candidates", "bulk-probes"):
    target = generated / name
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)

candidates = list((generated / "candidates").rglob("workflow.json"))
probes = list((generated / "runtime-probes").rglob("*.json"))
if len(candidates) != 99:
    raise SystemExit(f"WAVES BULK STAGE REFUSED: candidates={len(candidates)} expected=99")
if len(probes) != 198:
    raise SystemExit(f"WAVES BULK STAGE REFUSED: probes={len(probes)} expected=198")
for src in candidates:
    data = json.loads(src.read_text())
    (generated / "bulk-candidates" / f"{data['id']}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
for src in probes:
    data = json.loads(src.read_text())
    (generated / "bulk-probes" / f"{data['id']}.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
print("WAVES BULK STAGE: PASS candidates=99 probes=198")
PY
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
if [[ -d "$ROOT/waves/.generated/bulk-candidates" ]]; then
  echo "[waves] bulk import 99 generated W3-W11 production candidates"
  docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --separate --input=/workspace/waves/.generated/bulk-candidates </dev/null

  echo "[waves] bulk import 198 executable domain probes"
  docker compose -f "$COMPOSE" exec -T n8n n8n import:workflow --separate --input=/workspace/waves/.generated/bulk-probes </dev/null

  WAVE_PROBE_IDS="$(python "$ROOT/waves/tools/probe_ids.py")"

  echo "[waves] verify imported topology from n8n database"
  docker compose -f "$COMPOSE" exec -T n8n n8n export:workflow --all --output=/tmp/factory-all-workflows.json </dev/null
  docker compose -f "$COMPOSE" exec -T n8n node - <<'NODE'
const fs = require('fs');
const all = JSON.parse(fs.readFileSync('/tmp/factory-all-workflows.json', 'utf8'));
const candidateCount = all.filter(w => /^wave(?:3|4|5|6|7|8|9|10|11)/.test(String(w.id))).length;
const probeCount = all.filter(w => /^probe/.test(String(w.id))).length;
if (candidateCount !== 99) throw new Error(`WAVES_IMPORT_CANDIDATES expected=99 actual=${candidateCount}`);
if (probeCount !== 198) throw new Error(`WAVES_IMPORT_PROBES expected=198 actual=${probeCount}`);
console.log(`WAVES IMPORT TOPOLOGY: PASS candidates=${candidateCount} probes=${probeCount}`);
NODE
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
if (!Array.isArray(r.executions) || r.executions.length !== 198) throw new Error(`WAVES_EXECUTION_RECORDS expected=198 actual=${Array.isArray(r.executions) ? r.executions.length : "missing"}`);
if (r.executions.some(e => e.executionStatus !== "success")) throw new Error("WAVES_EXECUTION_STATUS contains non-success record");
console.log(`W3-W11 RUNTIME MATRIX: PASS probes=${s.successfulExecutions} failures=${s.failedExecutions || 0} warnings=${s.warningExecutions || 0}`);
NODE
    '
fi

echo "FACTORY RUNTIME SMOKE: PASS"
