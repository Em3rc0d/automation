#!/usr/bin/env python3
"""Build a zero-paid-infrastructure pilot plan from approved Savings Workflows.

This tool is a commercial/delivery bridge. It can scaffold local installation
bundles, but it never verifies connectors, stores secrets, marks a baseline as
agreed, performs live side effects, or records client acceptance.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"
REQUIREMENTS = ROOT / "operations/savings/connector-requirements.json"
PROVIDERS = ROOT / "connectors/savings/google-workspace/provider-catalog.json"
INSTALLER = ROOT / "tools/savings/install_approved.py"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_installer():
    spec = importlib.util.spec_from_file_location("savings_installer", INSTALLER)
    if spec is None or spec.loader is None:
        raise RuntimeError("cannot load install_approved.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_number(value: object, name: str, *, positive: bool = False) -> float | None:
    if value is None:
        return None
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f"{name} must be numeric")
    value = float(value)
    if positive and value <= 0:
        raise ValueError(f"{name} must be > 0")
    if not positive and value < 0:
        raise ValueError(f"{name} must be >= 0")
    return value


def economics(item: dict) -> dict | None:
    monthly_units = validate_number(item.get("monthlyUnits"), "monthlyUnits", positive=True)
    manual = validate_number(item.get("manualMinutesPerUnit"), "manualMinutesPerUnit", positive=True)
    after = validate_number(item.get("estimatedHumanMinutesAfterAutomation"), "estimatedHumanMinutesAfterAutomation")
    hourly = validate_number(item.get("loadedHourlyCost"), "loadedHourlyCost")
    if None in {monthly_units, manual, after, hourly}:
        return None
    if after > manual:
        raise ValueError("estimatedHumanMinutesAfterAutomation cannot exceed manualMinutesPerUnit")
    minutes_released = monthly_units * (manual - after)
    hours_released = minutes_released / 60
    capacity_value = hours_released * hourly
    return {
        "kind": "DISCOVERY_ESTIMATE",
        "monthlyUnits": monthly_units,
        "manualMinutesPerUnit": manual,
        "estimatedHumanMinutesAfterAutomation": after,
        "estimatedMonthlyMinutesReleased": minutes_released,
        "estimatedMonthlyHoursReleased": hours_released,
        "loadedHourlyCost": hourly,
        "estimatedMonthlyCapacityValue": capacity_value,
        "currency": item.get("currency", "PEN"),
        "warning": "Capacity value is not payroll cash savings. Replace discovery assumptions with an agreed SavingsBaseline before CLIENT_CONFIGURED.",
    }


def build_plan(spec: dict) -> dict:
    installer = load_installer()
    safe_errors = installer.assert_safe_tree(spec, "$.pilot")
    if safe_errors:
        raise ValueError("; ".join(safe_errors))

    tenant = spec.get("tenantId")
    if not isinstance(tenant, str) or not tenant.strip():
        raise ValueError("tenantId is required")

    requested = spec.get("workflows")
    if not isinstance(requested, list) or not requested:
        raise ValueError("workflows must be a non-empty array")

    registry = {item["key"]: item for item in read_json(REGISTRY)["entries"]}
    requirements = read_json(REQUIREMENTS)["workflows"]
    provider_catalog = read_json(PROVIDERS).get("providers", {})
    seen: set[str] = set()
    planned: list[dict] = []
    total_capacity_value = 0.0
    all_estimates = True

    for requested_item in requested:
        if not isinstance(requested_item, dict):
            raise ValueError("each workflows item must be an object")
        key = requested_item.get("key")
        if key in seen:
            raise ValueError(f"duplicate workflow key: {key}")
        seen.add(key)

        item = registry.get(key)
        if not item:
            raise ValueError(f"unknown workflow: {key}")
        if item.get("stage") != "APPROVED_BASELINE":
            raise ValueError(f"{key} is not APPROVED_BASELINE")

        provider_choices = requested_item.get("providers") or {}
        if not isinstance(provider_choices, dict):
            raise ValueError(f"{key}.providers must be an object")

        connector_plan: list[dict] = []
        blockers: list[str] = []
        for req in requirements.get(key, []):
            capability = req["capability"]
            provider = provider_choices.get(capability)
            supported = None
            if provider:
                catalog_entry = provider_catalog.get(provider)
                supported = bool(catalog_entry and capability in catalog_entry.get("capabilities", []))
                if not supported:
                    blockers.append(f"provider {provider} does not support {capability}")
            else:
                blockers.append(f"provider choice missing for {capability}")
            connector_plan.append({
                "capability": capability,
                "adapterRole": req["adapterRole"],
                "provider": provider,
                "providerSupported": supported,
                "credentialRefRequiredLater": True,
                "liveVerificationRequiredLater": True,
            })

        estimate = economics(requested_item)
        if estimate:
            total_capacity_value += estimate["estimatedMonthlyCapacityValue"]
        else:
            all_estimates = False
            blockers.append("discovery economics incomplete")

        baseline_method = requested_item.get("baselineMethod")
        confidence = requested_item.get("confidence")
        if baseline_method not in {None, "time_study", "system_data", "client_declared", "mixed"}:
            raise ValueError(f"{key}.baselineMethod invalid")
        if confidence not in {None, "low", "medium", "high"}:
            raise ValueError(f"{key}.confidence invalid")

        planned.append({
            "workflowKey": key,
            "version": item["version"],
            "name": item["name"],
            "domain": item["domain"],
            "runtimeProfile": item["runtime_profile"],
            "savingsUnit": item["savings_unit"],
            "manualWorkReduced": item["manual_work_reduced"],
            "executionModel": item["execution_model"],
            "providerCostPolicy": item["external_cost_policy"],
            "connectors": connector_plan,
            "discoveryEconomics": estimate,
            "baselineDraft": {
                "method": baseline_method,
                "confidence": confidence,
                "sampleSize": requested_item.get("baselineSampleSize"),
            },
            "blockersBeforeClientConfigured": blockers + [
                "real credential references and OAuth scopes",
                "successful live connector verification evidence",
                "client-reviewed configuration",
                "agreed SavingsBaseline",
                "cost-policy acceptance",
                "rollback review",
            ],
            "blockersBeforeClientAccepted": [
                "client fixture evidence",
                "incident-free live provider execution evidence",
                "explicit client approval evidence",
            ],
        })

    return {
        "schemaVersion": 1,
        "planType": "ZERO_COST_PILOT_PREFLIGHT",
        "tenantId": tenant,
        "workflowCount": len(planned),
        "workflows": planned,
        "economics": {
            "kind": "DISCOVERY_ESTIMATE",
            "complete": all_estimates,
            "estimatedMonthlyCapacityValue": total_capacity_value if all_estimates else None,
            "currency": spec.get("currency", "PEN"),
            "warning": "Discovery estimates are not contractual savings and are not production evidence.",
        },
        "infrastructure": {
            "preRevenueFixedPaidInfrastructureRequired": False,
            "dedicatedTenantRuntimeRequired": False,
            "defaultRuntime": "zero-deps-node-v1",
            "deploymentOptionsAfterClientConfigured": ["LOCAL_CRON", "EVENT_SPOOL", "SHARED_MANAGED_RUNTIME_WHEN_FUNDED"],
        },
        "promotionBoundary": {
            "mayScaffoldBundles": True,
            "mayAutoVerifyConnectors": False,
            "mayAutoAgreeBaseline": False,
            "mayAutoPromoteClientConfigured": False,
            "mayAutoPromoteClientAccepted": False,
        },
    }


def prefill_baseline(bundle: Path, workflow_spec: dict) -> None:
    baseline_path = bundle / "savings-baseline.json"
    baseline = read_json(baseline_path)
    mapping = {
        "manual_minutes_per_unit": workflow_spec.get("manualMinutesPerUnit"),
        "baseline_sample_size": workflow_spec.get("baselineSampleSize"),
        "baseline_method": workflow_spec.get("baselineMethod"),
        "loaded_hourly_cost": workflow_spec.get("loadedHourlyCost"),
        "confidence": workflow_spec.get("confidence"),
    }
    for field, value in mapping.items():
        if value is not None:
            baseline[field] = value
    baseline["status"] = "DRAFT"
    baseline["agreedAt"] = None
    write_json(baseline_path, baseline)


def scaffold_pilot(spec: dict, out_root: Path, created_at: str | None = None) -> dict:
    plan = build_plan(spec)
    installer = load_installer()
    bundles: list[str] = []
    by_key = {item["key"]: item for item in spec["workflows"]}
    for workflow in plan["workflows"]:
        key = workflow["workflowKey"]
        bundle = installer.scaffold(key, plan["tenantId"], out_root, created_at=created_at)
        prefill_baseline(bundle, by_key[key])
        bundles.append(str(bundle))
    out_root.mkdir(parents=True, exist_ok=True)
    plan_path = out_root / plan["tenantId"] / "PILOT-PLAN.json"
    plan_path.parent.mkdir(parents=True, exist_ok=True)
    write_json(plan_path, {**plan, "bundles": bundles})
    return {**plan, "bundles": bundles, "planPath": str(plan_path)}


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)

    plan = sub.add_parser("plan")
    plan.add_argument("--spec", type=Path, required=True)
    plan.add_argument("--out", type=Path)

    scaffold = sub.add_parser("scaffold")
    scaffold.add_argument("--spec", type=Path, required=True)
    scaffold.add_argument("--out-root", type=Path, default=ROOT / ".local/installations")

    return ap


def main() -> int:
    args = parser().parse_args()
    try:
        spec = read_json(args.spec)
        if args.command == "plan":
            value = build_plan(spec)
            if args.out:
                args.out.parent.mkdir(parents=True, exist_ok=True)
                write_json(args.out, value)
            print(json.dumps(value, indent=2, ensure_ascii=False))
            return 0
        if args.command == "scaffold":
            value = scaffold_pilot(spec, args.out_root.resolve())
            print(json.dumps(value, indent=2, ensure_ascii=False))
            return 0
    except (ValueError, FileNotFoundError, FileExistsError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 1


if __name__ == "__main__":
    sys.exit(main())
