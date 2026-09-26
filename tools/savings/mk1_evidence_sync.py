#!/usr/bin/env python3
"""Derive MK1 pilot gate booleans from installation/evidence artifacts.

This tool never fabricates external evidence. It only marks a gate true when the
referenced artifacts satisfy explicit local integrity/shape rules.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def evidence_ref(path: Path, base: Path) -> str:
    try:
        return path.resolve().relative_to(base.resolve()).as_posix()
    except ValueError:
        return str(path.resolve())


def bundle_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT / path


def gate(passed: bool, evidence: str | None, notes: str | None = None) -> dict:
    return {"passed": bool(passed), "evidence": evidence if passed else None, "notes": notes}


def all_true(values) -> bool:
    values = list(values)
    return bool(values) and all(values)


def sync(spec_path: Path) -> dict:
    spec = read_json(spec_path)
    base = spec_path.parent
    results: dict[str, dict] = {}
    workflows = spec.get("workflows") or []
    bundles = [bundle_path(item.get("bundlePath", "")) for item in workflows if isinstance(item, dict)]

    role_path = base / "role-model.json"
    if role_path.is_file():
        role = read_json(role_path)
        passed = role.get("status") == "AGREED" and bool(role.get("clientAgreedAt")) and bool(role.get("evidence"))
        results["roleModelAgreed"] = gate(passed, evidence_ref(role_path, base), "derived from role-model.json")
    else:
        results["roleModelAgreed"] = gate(False, None, "role-model.json missing")

    bound_checks = []
    verified_checks = []
    baseline_checks = []
    live_checks = []
    acceptance_checks = []
    connector_evidence = []
    baseline_evidence = []
    live_evidence = []
    acceptance_evidence = []

    for bundle in bundles:
        connectors_path = bundle / "connector-bindings.json"
        if connectors_path.is_file():
            doc = read_json(connectors_path)
            bindings = doc.get("bindings") or []
            bound = all_true(
                isinstance(binding.get("provider"), str)
                and isinstance(binding.get("credentialRef"), str)
                and binding["credentialRef"].startswith("credref:")
                for binding in bindings
            )
            verified = all_true(
                binding.get("status") == "verified"
                and isinstance(binding.get("scopes"), list)
                and len(binding.get("scopes") or []) > 0
                and isinstance(binding.get("verification"), dict)
                and bool(binding["verification"].get("evidenceRef"))
                and bool(binding["verification"].get("checkedAt"))
                for binding in bindings
            )
            bound_checks.append(bound)
            verified_checks.append(verified)
            connector_evidence.append(str(connectors_path))
        else:
            bound_checks.append(False)
            verified_checks.append(False)

        baseline_path = bundle / "savings-baseline.json"
        if baseline_path.is_file():
            baseline = read_json(baseline_path)
            agreed = (
                baseline.get("status") == "AGREED"
                and isinstance(baseline.get("manual_minutes_per_unit"), (int, float))
                and baseline.get("manual_minutes_per_unit") > 0
                and isinstance(baseline.get("baseline_sample_size"), int)
                and baseline.get("baseline_sample_size") > 0
                and baseline.get("baseline_method") in {"time_study", "system_data", "client_declared", "mixed"}
                and isinstance(baseline.get("loaded_hourly_cost"), (int, float))
                and baseline.get("loaded_hourly_cost") >= 0
                and baseline.get("confidence") in {"low", "medium", "high"}
                and bool(baseline.get("agreedAt"))
            )
            baseline_checks.append(agreed)
            baseline_evidence.append(str(baseline_path))
        else:
            baseline_checks.append(False)

        live_path = bundle / "evidence" / "live-execution-last.json"
        if live_path.is_file():
            live = read_json(live_path)
            passed = (
                live.get("evidenceType") == "LIVE_PROVIDER_EXECUTION"
                and live.get("productionConnectorExecution") is True
                and live.get("sideEffectsExplicitlyConfirmed") is True
                and live.get("success") is True
                and not (live.get("controlPlane", {}).get("incidents") or [])
            )
            live_checks.append(passed)
            live_evidence.append(str(live_path))
        else:
            live_checks.append(False)

        acceptance_path = bundle / "acceptance.json"
        ledger_path = bundle / "evidence" / "acceptance-ledger.jsonl"
        if acceptance_path.is_file():
            acceptance = read_json(acceptance_path)
            checks = acceptance.get("checks") or {}
            ref = (acceptance.get("evidenceRefs") or {}).get("clientApprovalRecorded")
            passed = (
                checks.get("clientApprovalRecorded") is True
                and isinstance(ref, dict)
                and bool(ref.get("entryId"))
                and bool(ref.get("sha256"))
                and bool(ref.get("snapshot"))
                and ledger_path.is_file()
            )
            acceptance_checks.append(passed)
            acceptance_evidence.append(str(acceptance_path))
        else:
            acceptance_checks.append(False)

    results["providerAccountBound"] = gate(
        all_true(bound_checks),
        ";".join(connector_evidence) if all_true(bound_checks) else None,
        "all selected bundles require provider + credref bindings",
    )
    results["connectorScopesVerified"] = gate(
        all_true(verified_checks),
        ";".join(connector_evidence) if all_true(verified_checks) else None,
        "all selected connector bindings must be verified with scopes and evidence",
    )
    results["savingsBaselineAgreed"] = gate(
        all_true(baseline_checks),
        ";".join(baseline_evidence) if all_true(baseline_checks) else None,
        "all selected workflow baselines must be AGREED",
    )
    results["controlledLiveExecutionPassed"] = gate(
        all_true(live_checks),
        ";".join(live_evidence) if all_true(live_checks) else None,
        "all selected workflows require successful live-provider evidence",
    )
    results["clientAcceptanceRecorded"] = gate(
        all_true(acceptance_checks),
        ";".join(acceptance_evidence) if all_true(acceptance_checks) else None,
        "all selected bundles require hashed clientApprovalRecorded evidence",
    )

    isolation_path = base / "tenant-isolation.json"
    if isolation_path.is_file():
        isolation = read_json(isolation_path)
        controls = isolation.get("controls") or {}
        passed = (
            isolation.get("status") == "PROVED"
            and controls
            and all(value is True for value in controls.values())
            and bool(isolation.get("evidence"))
        )
        results["tenantIsolationProved"] = gate(
            passed, evidence_ref(isolation_path, base), "derived from tenant-isolation.json"
        )
    else:
        results["tenantIsolationProved"] = gate(False, None, "tenant-isolation.json missing")

    deployment_path = base / "deployment-decision.json"
    if deployment_path.is_file():
        deployment = read_json(deployment_path)
        passed = (
            deployment.get("status") == "APPROVED"
            and deployment.get("selectedMode") in {"LOCAL_CRON", "EVENT_SPOOL", "SHARED_MANAGED_RUNTIME"}
            and deployment.get("rollbackReviewed") is True
            and deployment.get("backupRestoreReviewed") is True
            and deployment.get("incidentPathReviewed") is True
            and bool(deployment.get("approvedAt"))
            and bool(deployment.get("evidence"))
        )
        results["deploymentRollbackApproved"] = gate(
            passed, evidence_ref(deployment_path, base), "derived from deployment-decision.json"
        )
    else:
        results["deploymentRollbackApproved"] = gate(False, None, "deployment-decision.json missing")

    for filename, gate_name in [
        ("backup-restore-evidence.json", "backupRestorePassed"),
        ("live-incident-drill-evidence.json", "incidentDrillPassed"),
    ]:
        path = base / "ops" / filename
        if path.is_file():
            value = read_json(path)
            passed = value.get("passed") is True and bool(value.get("evidence")) and bool(value.get("recordedAt"))
            results[gate_name] = gate(passed, evidence_ref(path, base), f"derived from ops/{filename}")
        else:
            results[gate_name] = gate(False, None, f"ops/{filename} missing")

    current = spec.setdefault("gates", {})
    for name, value in results.items():
        current[name] = value

    return {
        "spec": spec,
        "derived": results,
        "remainingFalse": sorted(name for name, value in results.items() if not value["passed"]),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--spec", type=Path, required=True)
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    try:
        result = sync(args.spec.resolve())
        if args.write:
            write_json(args.spec.resolve(), result["spec"])
        print(json.dumps({
            "derived": result["derived"],
            "remainingFalse": result["remainingFalse"],
            "written": bool(args.write),
        }, indent=2, ensure_ascii=False))
        return 0
    except (FileNotFoundError, json.JSONDecodeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
