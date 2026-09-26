#!/usr/bin/env python3
"""Create the complete zero-cost local workspace for a funded/real pilot candidate.

This orchestrates existing repository tools. It does not bind credentials,
verify providers, perform live side effects or mark the client accepted.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOOTSTRAP_PATH = ROOT / "tools/savings/pilot_bootstrap.py"
INTAKE_PATH = ROOT / "tools/savings/pilot_intake.py"
GATE_PATH = ROOT / "tools/savings/mk1_gate.py"


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def launch(spec_path: Path, installations_root: Path, pilot_root: Path) -> dict:
    bootstrap = load(BOOTSTRAP_PATH, "pilot_bootstrap")
    intake = load(INTAKE_PATH, "pilot_intake")
    gate = load(GATE_PATH, "mk1_gate")

    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    plan = bootstrap.build_plan(spec)
    tenant = plan["tenantId"]

    installation_tenant = installations_root / tenant
    pilot_tenant = pilot_root / tenant
    if installation_tenant.exists():
        raise FileExistsError(f"installation tenant directory already exists: {installation_tenant}")
    if pilot_tenant.exists():
        raise FileExistsError(f"pilot intake directory already exists: {pilot_tenant}")

    scaffold = bootstrap.scaffold_pilot(spec, installations_root)
    intake_result = intake.generate(spec_path, pilot_root)

    evidence_path = Path(intake_result["path"]) / "mk1-pilot-evidence.json"
    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))

    bundle_by_key = {}
    for raw in scaffold["bundles"]:
        path = Path(raw)
        name = path.name
        key = name.split("@", 1)[0]
        bundle_by_key[key] = str(path)

    for item in evidence.get("workflows", []):
        key = item["key"]
        if key in bundle_by_key:
            item["bundlePath"] = bundle_by_key[key]

    evidence_path.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    gate_result = gate.evaluate(evidence)

    if gate_result["readyForMK1Certification"]:
        raise RuntimeError("fresh launch unexpectedly passed MK1 gate; initial workspace must be blocked")

    return {
        "schemaVersion": 1,
        "tenantId": tenant,
        "installationRoot": str(installation_tenant),
        "pilotRoot": str(pilot_tenant),
        "pilotPlan": scaffold["planPath"],
        "workflowCount": scaffold["workflowCount"],
        "bundles": scaffold["bundles"],
        "mk1EvidenceSpec": str(evidence_path),
        "initialGate": "BLOCKED",
        "initialBlockers": gate_result["blockers"],
        "nextCommands": [
            f"python tools/savings/mk1_evidence_sync.py --spec {evidence_path} --write",
            f"python tools/savings/mk1_gate.py check --spec {evidence_path}",
            f"python tools/savings/mk1_gate.py seal --spec {evidence_path} --out {pilot_tenant / 'MK1-PILOT-SEAL.json'}",
        ],
        "boundary": "No provider secret, live side effect, client acceptance or production certification was created.",
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--spec", type=Path, required=True)
    ap.add_argument("--installations-root", type=Path, default=ROOT / ".local/installations")
    ap.add_argument("--pilot-root", type=Path, default=ROOT / ".local/pilot")
    args = ap.parse_args()

    try:
        result = launch(
            args.spec.resolve(),
            args.installations_root.resolve(),
            args.pilot_root.resolve(),
        )
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except (ValueError, RuntimeError, FileNotFoundError, FileExistsError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
