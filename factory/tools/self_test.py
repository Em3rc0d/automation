#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PROMOTE = REPO / "factory/tools/promote.py"
FAILURE = REPO / "factory/tools/record_failure.py"


def run(cmd: list[str], root: Path) -> None:
    env = os.environ.copy()
    env["AUTOMATION_FACTORY_ROOT"] = str(root)
    subprocess.run(cmd, check=True, env=env)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="automation-factory-") as td:
        root = Path(td)
        tested = root / "quarries/workflow-quarry/40-tested/platform/FACTORY_PROBE@0.0.0"
        evidence = tested / "evidence"
        evidence.mkdir(parents=True)
        (root / "quarries/workflow-quarry/50-approved-baseline").mkdir(parents=True)
        (root / "quarries/workflow-quarry/no-pass-verified/test-failed").mkdir(parents=True)
        (root / "workflows/n8n").mkdir(parents=True)

        workflow = {
            "name": "FACTORY_PROMOTION_PROBE",
            "nodes": [{"name": "Probe", "type": "n8n-nodes-base.noOp", "parameters": {}, "position": [0, 0], "typeVersion": 1}],
            "connections": {},
            "meta": {"candidateKey": "FACTORY_PROBE", "candidateVersion": "0.0.0", "stage": "TESTED", "origin": "FACTORY_SELF_TEST"},
        }
        (tested / "workflow.json").write_text(json.dumps(workflow), encoding="utf-8")
        (tested / "manifest.yaml").write_text("stage: TESTED\norigin: FACTORY_SELF_TEST\n", encoding="utf-8")
        (tested / "config.schema.json").write_text('{"type":"object"}', encoding="utf-8")
        (tested / "README.md").write_text("# Factory probe\n", encoding="utf-8")
        (evidence / "TEST-REPORT.md").write_text("VERDICT: PASS\n", encoding="utf-8")

        source_before = (tested / "workflow.json").read_bytes()
        rel = tested.relative_to(root)
        run([sys.executable, str(PROMOTE), "--package", str(rel), "--family", "platform", "--dry-run"], root)
        run([sys.executable, str(PROMOTE), "--package", str(rel), "--family", "platform"], root)

        if not tested.exists() or (tested / "workflow.json").read_bytes() != source_before:
            raise SystemExit("FACTORY SELF TEST FAIL: promotion modified/deleted source")
        approved = root / "quarries/workflow-quarry/50-approved-baseline/platform/FACTORY_PROBE@0.0.0"
        library = root / "workflows/n8n/platform/FACTORY_PROBE@0.0.0"
        if not approved.is_dir() or not library.is_dir():
            raise SystemExit("FACTORY SELF TEST FAIL: promotion copies missing")

        run([
            sys.executable, str(FAILURE),
            "--source", str(rel),
            "--category", "test-failed",
            "--reason", "factory self-test synthetic failure",
            "--out-name", "factory-self-test",
        ], root)
        if not tested.exists() or (tested / "workflow.json").read_bytes() != source_before:
            raise SystemExit("FACTORY SELF TEST FAIL: failure recorder modified/deleted source")
        failure_record = root / "quarries/workflow-quarry/no-pass-verified/test-failed/factory-self-test/FAILURE.json"
        if not failure_record.is_file():
            raise SystemExit("FACTORY SELF TEST FAIL: no-pass evidence missing")
        recorded = json.loads(failure_record.read_text(encoding="utf-8"))
        if recorded.get("sourcePreserved") is not True:
            raise SystemExit("FACTORY SELF TEST FAIL: preservation flag missing")

    print("FACTORY NON-DESTRUCTIVE SELF TEST: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
