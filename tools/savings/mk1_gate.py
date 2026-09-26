#!/usr/bin/env python3
"""Evaluate MK1 real-pilot readiness without inventing external evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"

REQUIRED_GATES = [
    "roleModelAgreed",
    "providerAccountBound",
    "connectorScopesVerified",
    "savingsBaselineAgreed",
    "controlledLiveExecutionPassed",
    "clientAcceptanceRecorded",
    "tenantIsolationProved",
    "backupRestorePassed",
    "incidentDrillPassed",
    "deploymentRollbackApproved",
]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def evidence_ok(value: object) -> bool:
    return isinstance(value, str) and bool(value.strip())


def evaluate(spec: dict) -> dict:
    errors: list[str] = []
    blockers: list[str] = []
    registry = {item["key"]: item for item in read_json(REGISTRY)["entries"]}

    if spec.get("schemaVersion") != 1:
        errors.append("schemaVersion must be 1")

    tenant = spec.get("tenantId")
    if not isinstance(tenant, str) or not tenant.strip():
        errors.append("tenantId is required")

    pilot = spec.get("pilot")
    if not isinstance(pilot, dict):
        errors.append("pilot object is required")
        pilot = {}
    funding = pilot.get("fundingStatus")
    if funding not in {"UNFUNDED", "FUNDED", "PAID"}:
        errors.append("pilot.fundingStatus invalid")
    elif funding == "UNFUNDED":
        blockers.append("paying/funded pilot not yet confirmed")

    surface = spec.get("surface")
    if not isinstance(surface, dict):
        errors.append("surface object is required")
        surface = {}
    mode = surface.get("mode")
    if mode not in {"REDUCED_STATIC", "HOSTED_PORTAL"}:
        errors.append("surface.mode invalid")
    if mode == "REDUCED_STATIC":
        if not evidence_ok(surface.get("clientAgreementEvidence")):
            blockers.append("reduced surface requires explicit client agreement evidence")
        if not evidence_ok(surface.get("deliveryChannel")):
            blockers.append("reduced surface requires client-approved access-controlled delivery channel")

    workflows = spec.get("workflows")
    if not isinstance(workflows, list) or len(workflows) < 2:
        errors.append("at least two workflows are required")
        workflows = []
    seen: set[str] = set()
    workflow_results: list[dict] = []
    for item in workflows:
        if not isinstance(item, dict):
            errors.append("workflow entries must be objects")
            continue
        key = item.get("key")
        if not isinstance(key, str) or not key:
            errors.append("workflow.key is required")
            continue
        if key in seen:
            errors.append(f"duplicate workflow: {key}")
            continue
        seen.add(key)
        reg = registry.get(key)
        if not reg:
            errors.append(f"unknown workflow: {key}")
            continue
        if reg.get("stage") != "APPROVED_BASELINE":
            blockers.append(f"{key} is not APPROVED_BASELINE")
        bundle = item.get("bundlePath")
        bundle_exists = isinstance(bundle, str) and (ROOT / bundle).is_dir()
        if not bundle_exists:
            blockers.append(f"{key} installation bundle missing: {bundle}")
        workflow_results.append({
            "key": key,
            "stage": reg.get("stage"),
            "bundlePath": bundle,
            "bundleExists": bundle_exists,
        })

    gates = spec.get("gates")
    if not isinstance(gates, dict):
        errors.append("gates object is required")
        gates = {}
    gate_results: dict[str, dict] = {}
    for name in REQUIRED_GATES:
        value = gates.get(name)
        if not isinstance(value, dict):
            errors.append(f"gates.{name} is required")
            continue
        passed = value.get("passed")
        evidence = value.get("evidence")
        if not isinstance(passed, bool):
            errors.append(f"gates.{name}.passed must be boolean")
            continue
        if passed and not evidence_ok(evidence):
            errors.append(f"gates.{name} cannot pass without evidence")
        if not passed:
            blockers.append(name)
        gate_results[name] = {
            "passed": passed,
            "evidence": evidence,
            "notes": value.get("notes"),
        }

    ready = not errors and not blockers
    return {
        "schemaVersion": 1,
        "tenantId": tenant,
        "readyForMK1Certification": ready,
        "fundingStatus": funding,
        "surfaceMode": mode,
        "workflowCount": len(workflow_results),
        "workflows": workflow_results,
        "gates": gate_results,
        "errors": errors,
        "blockers": blockers,
        "boundary": (
            "PASS means repository-declared MK1 real-pilot gates have evidence references. "
            "It does not independently verify third-party truth outside those artifacts."
        ),
    }


def seal(spec_path: Path, out: Path) -> dict:
    spec = read_json(spec_path)
    result = evaluate(spec)
    if not result["readyForMK1Certification"]:
        raise ValueError("cannot seal: MK1 pilot evidence is not complete")
    payload = {
        "schemaVersion": 1,
        "spec": str(spec_path),
        "specSha256": sha256(spec_path),
        "result": result,
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return payload


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)

    check = sub.add_parser("check")
    check.add_argument("--spec", type=Path, required=True)
    check.add_argument("--json", action="store_true")

    seal_cmd = sub.add_parser("seal")
    seal_cmd.add_argument("--spec", type=Path, required=True)
    seal_cmd.add_argument("--out", type=Path, required=True)
    return ap


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "check":
            result = evaluate(read_json(args.spec))
            if args.json:
                print(json.dumps(result, indent=2, ensure_ascii=False))
            else:
                print("MK1 REAL PILOT GATE:", "PASS" if result["readyForMK1Certification"] else "BLOCKED")
                for blocker in result["blockers"]:
                    print(f"- blocker: {blocker}")
                for error in result["errors"]:
                    print(f"- error: {error}")
            return 0 if result["readyForMK1Certification"] else 2

        if args.command == "seal":
            payload = seal(args.spec, args.out)
            print(json.dumps(payload, indent=2, ensure_ascii=False))
            return 0
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 1


if __name__ == "__main__":
    sys.exit(main())
