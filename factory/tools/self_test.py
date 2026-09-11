#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
INDEXER = REPO / "quarries/workflow-quarry/tools/index_workflow_corpus.py"
GATE = REPO / "factory/tools/record_gate.py"
PROMOTE = REPO / "factory/tools/promote.py"
FAILURE = REPO / "factory/tools/record_failure.py"


def run(cmd: list[str], root: Path) -> None:
    env = os.environ.copy()
    env["AUTOMATION_FACTORY_ROOT"] = str(root)
    subprocess.run(cmd, check=True, env=env)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="automation-factory-") as td:
        root = Path(td)

        # ---- DISCOVERY / INTAKE PROOF ----
        raw = root / "raw-corpus"
        raw.mkdir(parents=True)
        raw_workflow = raw / "synthetic.json"
        raw_workflow.write_text(
            json.dumps({
                "id": "factoryDiscoveryProbe",
                "name": "Factory Discovery Probe",
                "active": False,
                "nodes": [{
                    "id": "manual",
                    "name": "Manual Trigger",
                    "type": "n8n-nodes-base.manualTrigger",
                    "typeVersion": 1,
                    "position": [0, 0],
                    "parameters": {},
                }],
                "connections": {},
            }),
            encoding="utf-8",
        )
        raw_before = raw_workflow.read_bytes()
        mined = root / "mined/synthetic"
        subprocess.run([
            sys.executable, str(INDEXER),
            "--source-dir", str(raw),
            "--source-id", "factory-self-test",
            "--source-url", "https://example.invalid/factory-self-test",
            "--source-commit", "0" * 40,
            "--license-status", "UNKNOWN",
            "--output-dir", str(mined),
        ], check=True)
        candidates = (mined / "candidates.jsonl").read_text(encoding="utf-8").strip().splitlines()
        if len(candidates) != 1:
            raise SystemExit("FACTORY SELF TEST FAIL: discovery indexer did not preserve exactly one synthetic candidate")
        candidate = json.loads(candidates[0])
        if candidate.get("initial_stage") != "DISCOVERED" or candidate.get("deleted") is not False:
            raise SystemExit("FACTORY SELF TEST FAIL: discovery policy fields incorrect")
        if raw_workflow.read_bytes() != raw_before:
            raise SystemExit("FACTORY SELF TEST FAIL: discovery modified source")

        # ---- IMMUTABLE HUMAN GATE EVIDENCE PROOF ----
        raw_rel = raw_workflow.relative_to(root)
        gate_sequence = [
            ("DISCOVERED", "REGISTERED", "discover"),
            ("LICENSE_CHECKED", "ALLOW_ADAPT", "license"),
            ("INSPECTED", "PASS", "inspect"),
        ]
        for stage, decision, record_id in gate_sequence:
            run([
                sys.executable, str(GATE),
                "--candidate-id", "FACTORY-SELF-TEST",
                "--stage", stage,
                "--decision", decision,
                "--actor", "factory-ci",
                "--source-ref", str(raw_rel),
                "--evidence-ref", "synthetic-self-test",
                "--record-id", record_id,
            ], root)
        if raw_workflow.read_bytes() != raw_before:
            raise SystemExit("FACTORY SELF TEST FAIL: gate recording modified source")
        license_record = root / "quarries/workflow-quarry/10-license-checked/_gate-records/FACTORY-SELF-TEST/license.json"
        if not license_record.is_file():
            raise SystemExit("FACTORY SELF TEST FAIL: license gate record missing")
        gate_data = json.loads(license_record.read_text(encoding="utf-8"))
        if gate_data.get("automatedDecision") is not False or gate_data.get("source", {}).get("preserved") is not True:
            raise SystemExit("FACTORY SELF TEST FAIL: gate provenance/preservation flags invalid")

        # ---- TESTED -> APPROVED PROMOTION PROOF ----
        tested = root / "quarries/workflow-quarry/40-tested/platform/FACTORY_PROBE@0.0.0"
        evidence = tested / "evidence"
        evidence.mkdir(parents=True)
        (root / "quarries/workflow-quarry/50-approved-baseline").mkdir(parents=True)
        (root / "quarries/workflow-quarry/no-pass-verified/test-failed").mkdir(parents=True)
        (root / "workflows/n8n").mkdir(parents=True)

        workflow = {
            "id": "factoryPromotionProbe",
            "name": "FACTORY_PROMOTION_PROBE",
            "nodes": [{"id": "probe", "name": "Probe", "type": "n8n-nodes-base.noOp", "parameters": {}, "position": [0, 0], "typeVersion": 1}],
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

        # ---- FAILURE PRESERVATION PROOF ----
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

    print("FACTORY END-TO-END MECHANICS SELF TEST: PASS")
    print("Discovery indexing + human gate evidence + promotion + no-pass preservation verified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
