#!/usr/bin/env python3
"""Run an MK1 zero-cost pilot rehearsal with two approved Savings Workflows.

This is intentionally non-production. It creates temporary installation bundles,
executes approved workflow code with local fixtures/in-memory adapters, aggregates
operator/client views and reports the real blockers that still prevent
CLIENT_CONFIGURED / CLIENT_ACCEPTED.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INSTALLER_PATH = ROOT / "tools/savings/install_approved.py"
RUNNER = ROOT / "operations/savings/runtime/run_bundle.mjs"
DEFAULT_PLAN = ROOT / "mk1/rehearsal/pilot-plan.json"

SPEC = importlib.util.spec_from_file_location("install_approved", INSTALLER_PATH)
installer = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(installer)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def agree_baseline(bundle: Path, baseline: dict) -> None:
    path = bundle / "savings-baseline.json"
    doc = read_json(path)
    doc.update({
        "status": "AGREED",
        "manual_minutes_per_unit": baseline["manual_minutes_per_unit"],
        "baseline_sample_size": baseline["baseline_sample_size"],
        "baseline_method": baseline["baseline_method"],
        "loaded_hourly_cost": baseline["loaded_hourly_cost"],
        "currency": baseline.get("currency", "PEN"),
        "confidence": baseline["confidence"],
        "agreedAt": "2026-09-25T12:00:00Z",
        "assumptions": ["MK1 rehearsal fixture; replace with client-measured baseline before acceptance."],
    })
    write_json(path, doc)


def execute_bundle(bundle: Path, fixture: Path) -> dict:
    completed = subprocess.run(
        [
            "node",
            str(RUNNER),
            "--bundle",
            str(bundle),
            "--fixture",
            str(fixture),
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"bundle execution failed rc={completed.returncode}: {completed.stderr.strip()}"
        )
    return json.loads(completed.stdout)


def attention_records(result: dict) -> list[dict]:
    records = result.get("controlPlane", {}).get("processRecords", [])
    return [record for record in records if record.get("requiresAttention") is True]


def build_client_view(results: list[dict]) -> dict:
    workflows = []
    total_hours = 0.0
    total_value = 0.0
    total_units = 0
    total_attention = 0

    for result in results:
        savings = result.get("savings") or {}
        attention = attention_records(result)
        total_hours += float(savings.get("hoursReleased") or 0)
        total_value += float(savings.get("estimatedCapacityValue") or 0)
        total_units += int(savings.get("automatedUnits") or 0)
        total_attention += len(attention)
        workflows.append({
            "workflowKey": result["workflowKey"],
            "status": "REHEARSAL_ONLY",
            "automatedUnits": savings.get("automatedUnits", 0),
            "hoursReleased": savings.get("hoursReleased", 0),
            "estimatedCapacityValue": savings.get("estimatedCapacityValue", 0),
            "currency": savings.get("currency", "PEN"),
            "attentionItems": [
                {
                    "entityType": record.get("entityType"),
                    "entityId": record.get("entityId"),
                    "status": record.get("status"),
                    "summary": record.get("summary"),
                }
                for record in attention
            ],
        })

    return {
        "surface": "CLIENT_PORTAL_REHEARSAL",
        "productionClaim": False,
        "summary": {
            "automationCount": len(workflows),
            "automatedUnits": total_units,
            "hoursReleased": total_hours,
            "estimatedCapacityValue": total_value,
            "currency": "PEN",
            "attentionItems": total_attention,
        },
        "workflows": workflows,
        "methodologyNotice": (
            "Rehearsal values use fixture baselines and demonstrate the Savings Engine. "
            "They are not client-certified savings."
        ),
    }


def build_operator_view(results: list[dict], blockers: dict[str, list[str]]) -> dict:
    workflows = []
    for result in results:
        cp = result.get("controlPlane", {})
        workflows.append({
            "workflowKey": result["workflowKey"],
            "installationId": result["installationId"],
            "runtimeProfile": result["runtimeProfile"],
            "runs": len(cp.get("executionRuns", [])),
            "executionEvents": len(cp.get("executionEvents", [])),
            "processRecords": len(cp.get("processRecords", [])),
            "savingsEvents": len(cp.get("savingsEvents", [])),
            "incidents": len(cp.get("incidents", [])),
            "clientConfiguredBlockers": blockers[result["workflowKey"]],
        })
    return {
        "surface": "OPERATOR_CONSOLE_REHEARSAL",
        "productionClaim": False,
        "paidInfrastructureRequired": False,
        "workflows": workflows,
    }


def run_rehearsal(plan_path: Path, out_dir: Path) -> dict:
    plan = read_json(plan_path)
    if plan.get("productionClaim") is not False:
        raise ValueError("rehearsal plan must explicitly set productionClaim=false")
    workflows = plan.get("workflows", [])
    if len(workflows) < 2:
        raise ValueError("MK1 rehearsal requires at least two workflows")

    bundles_root = out_dir / "installations"
    results: list[dict] = []
    blockers: dict[str, list[str]] = {}

    for spec in workflows:
        key = spec["key"]
        bundle = installer.scaffold(
            key,
            plan["tenantId"],
            bundles_root,
            "2026-09-25T12:00:00Z",
        )
        agree_baseline(bundle, spec["baseline"])

        # Review-only checks that do not pretend connector or client evidence exists.
        for check in ["configReviewed", "baselineAgreed", "costPolicyAccepted", "rollbackReviewed"]:
            installer.set_check(bundle, check, True)

        fixture = ROOT / spec["fixture"]
        result = execute_bundle(bundle, fixture)
        if result.get("productionEvidence") is not False:
            raise AssertionError(f"{key} rehearsal unexpectedly claims production evidence")
        if result.get("evidenceType") != "LOCAL_SIMULATION":
            raise AssertionError(f"{key} rehearsal must remain LOCAL_SIMULATION")

        result_path = out_dir / "results" / f"{key}.json"
        write_json(result_path, result)
        results.append(result)

        diagnosis = installer.diagnose(bundle, "CLIENT_CONFIGURED")
        if diagnosis["ready"]:
            raise AssertionError(
                f"{key} rehearsal must remain blocked from CLIENT_CONFIGURED without real connector verification"
            )
        blockers[key] = diagnosis["blockers"]

    client_view = build_client_view(results)
    operator_view = build_operator_view(results, blockers)
    write_json(out_dir / "client-portal.json", client_view)
    write_json(out_dir / "operator-console.json", operator_view)

    summary = {
        "schemaVersion": 1,
        "tenantId": plan["tenantId"],
        "productionClaim": False,
        "paidInfrastructureRequired": False,
        "workflowCount": len(results),
        "workflowKeys": [result["workflowKey"] for result in results],
        "localSimulationPassed": True,
        "clientConfigured": False,
        "clientAccepted": False,
        "clientPortal": client_view["summary"],
        "operator": {
            "totalRuns": sum(item["runs"] for item in operator_view["workflows"]),
            "totalProcessRecords": sum(item["processRecords"] for item in operator_view["workflows"]),
            "totalSavingsEvents": sum(item["savingsEvents"] for item in operator_view["workflows"]),
            "totalIncidents": sum(item["incidents"] for item in operator_view["workflows"]),
        },
        "remainingRealPilotGates": {
            key: blockers[key] for key in sorted(blockers)
        },
    }
    write_json(out_dir / "summary.json", summary)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, default=DEFAULT_PLAN)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if args.out:
        args.out.mkdir(parents=True, exist_ok=True)
        summary = run_rehearsal(args.plan, args.out)
    else:
        with tempfile.TemporaryDirectory(prefix="mk1-rehearsal-") as tmp:
            summary = run_rehearsal(args.plan, Path(tmp))

    if args.json:
        print(json.dumps(summary, indent=2, ensure_ascii=False))
    else:
        print("MK1 PILOT REHEARSAL: PASS")
        print(f"tenant={summary['tenantId']} workflows={summary['workflowCount']}")
        print(
            f"runs={summary['operator']['totalRuns']} "
            f"process_records={summary['operator']['totalProcessRecords']} "
            f"savings_events={summary['operator']['totalSavingsEvents']} "
            f"incidents={summary['operator']['totalIncidents']}"
        )
        print("production_claim=false client_configured=false client_accepted=false paid_infra=false")
    return 0


if __name__ == "__main__":
    sys.exit(main())
