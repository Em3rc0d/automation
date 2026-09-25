#!/usr/bin/env python3
"""Zero-dependency operator installer for APPROVED_BASELINE Savings Workflows.

This tool creates local/client installation bundles only. It never provisions cloud
infrastructure, stores live secrets, or changes repository workflow lifecycle state.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"
REQUIREMENTS = ROOT / "operations/savings/connector-requirements.json"
APPROVED_ROOT = ROOT / "workflows/approved/savings"

SECRET_KEY = re.compile(r"(password|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|private[_-]?key)", re.I)
SECRET_VALUE = re.compile(r"(?:sk-[A-Za-z0-9_-]{12,}|AKIA[0-9A-Z]{16}|-----BEGIN .*PRIVATE KEY-----)")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def registry_by_key() -> dict[str, dict]:
    return {item["key"]: item for item in read_json(REGISTRY)["entries"]}


def connector_requirements() -> dict[str, list[dict]]:
    return read_json(REQUIREMENTS)["workflows"]


def approved_entries() -> list[dict]:
    return sorted(
        [item for item in registry_by_key().values() if item.get("stage") == "APPROVED_BASELINE"],
        key=lambda item: (item["domain"], item["key"]),
    )


def approved_record(item: dict) -> dict:
    rel = item.get("approval", {}).get("baseline_record")
    if not rel:
        raise ValueError(f"{item['key']} has no approved baseline record")
    path = ROOT / rel
    if not path.is_file():
        raise ValueError(f"{item['key']} approved baseline record missing: {rel}")
    return read_json(path)


def defaults_from_schema(schema: dict) -> dict:
    required = set(schema.get("required", []))
    result: dict[str, object] = {}
    for key, prop in schema.get("properties", {}).items():
        if "default" in prop:
            result[key] = prop["default"]
        elif key in required:
            result[key] = None
    return result


def installation_id(tenant_id: str, key: str, version: str) -> str:
    digest = hashlib.sha256(f"{tenant_id}:{key}:{version}".encode()).hexdigest()[:16]
    return f"inst_{digest}"


def assert_safe_tree(value: object, path: str = "$") -> list[str]:
    errors: list[str] = []
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if SECRET_KEY.search(str(key)) and child not in (None, "", [], {}):
                errors.append(f"embedded secret-like field at {child_path}; store only credential references")
            errors.extend(assert_safe_tree(child, child_path))
    elif isinstance(value, list):
        for i, child in enumerate(value):
            errors.extend(assert_safe_tree(child, f"{path}[{i}]"))
    elif isinstance(value, str) and SECRET_VALUE.search(value):
        errors.append(f"embedded secret-like value at {path}")
    return errors


def scaffold(workflow_key: str, tenant_id: str, out_root: Path, created_at: str | None = None) -> Path:
    entries = registry_by_key()
    item = entries.get(workflow_key)
    if not item:
        raise ValueError(f"unknown workflow: {workflow_key}")
    if item.get("stage") != "APPROVED_BASELINE":
        raise ValueError(f"{workflow_key} is not APPROVED_BASELINE")

    approved = approved_record(item)
    requirements = connector_requirements().get(workflow_key)
    if requirements is None:
        raise ValueError(f"connector requirements not defined for {workflow_key}")

    package = ROOT / approved["packagePath"]
    config_schema = read_json(package / "config.schema.json")
    config = defaults_from_schema(config_schema)
    created_at = created_at or now_iso()
    bundle = out_root / tenant_id / f"{workflow_key}@{item['version']}"
    if bundle.exists():
        raise FileExistsError(f"installation bundle already exists: {bundle}")
    bundle.mkdir(parents=True)

    installation = {
        "schemaVersion": 1,
        "installationId": installation_id(tenant_id, workflow_key, item["version"]),
        "tenantId": tenant_id,
        "workflowKey": workflow_key,
        "workflowVersion": item["version"],
        "approvedBaselineRecord": item["approval"]["baseline_record"],
        "runtimeProfile": "zero-deps-node-v1",
        "state": "DRAFT",
        "createdAt": created_at,
        "configuredAt": None,
        "acceptedAt": None,
        "dedicatedInfrastructure": False,
        "providerCostPolicy": "CLIENT_OWNED_OR_METERED",
    }
    connectors = {
        "schemaVersion": 1,
        "secretPolicy": "REFERENCES_ONLY",
        "bindings": [
            {
                "capability": req["capability"],
                "adapterRole": req["adapterRole"],
                "provider": None,
                "credentialRef": None,
                "scopes": [],
                "status": "unbound",
            }
            for req in requirements
        ],
    }
    baseline = {
        "schemaVersion": 1,
        "workflowKey": workflow_key,
        "unit": item["savings_unit"],
        "status": "DRAFT",
        "manual_minutes_per_unit": None,
        "baseline_sample_size": None,
        "baseline_method": None,
        "loaded_hourly_cost": None,
        "currency": "PEN",
        "confidence": None,
        "assumptions": [],
        "agreedAt": None,
    }
    acceptance = {
        "schemaVersion": 1,
        "checks": {
            "configReviewed": False,
            "connectorScopesVerified": False,
            "baselineAgreed": False,
            "costPolicyAccepted": False,
            "rollbackReviewed": False,
            "productionDryRunPassed": False,
            "clientFixturePassed": False,
            "clientApprovalRecorded": False,
        },
        "notes": [],
    }

    write_json(bundle / "installation.json", installation)
    write_json(bundle / "config.json", config)
    write_json(bundle / "connector-bindings.json", connectors)
    write_json(bundle / "savings-baseline.json", baseline)
    write_json(bundle / "acceptance.json", acceptance)
    (bundle / "README.md").write_text(
        f"# Installation bundle — {workflow_key}\n\n"
        f"Tenant: `{tenant_id}`\n\n"
        "State: **DRAFT**. This local bundle contains configuration and credential references only; "
        "never paste provider secrets into these files.\n",
        encoding="utf-8",
    )
    return bundle


def required_config_missing(bundle: Path, item: dict) -> list[str]:
    approved = approved_record(item)
    schema = read_json(ROOT / approved["packagePath"] / "config.schema.json")
    config = read_json(bundle / "config.json")
    return [key for key in schema.get("required", []) if config.get(key) in (None, "")]


def diagnose(bundle: Path, target: str = "CLIENT_CONFIGURED") -> dict:
    errors: list[str] = []
    files = {
        name: bundle / name
        for name in [
            "installation.json",
            "config.json",
            "connector-bindings.json",
            "savings-baseline.json",
            "acceptance.json",
        ]
    }
    for name, path in files.items():
        if not path.is_file():
            errors.append(f"missing {name}")
    if errors:
        return {"ready": False, "target": target, "blockers": errors}

    installation = read_json(files["installation.json"])
    config = read_json(files["config.json"])
    connectors = read_json(files["connector-bindings.json"])
    baseline = read_json(files["savings-baseline.json"])
    acceptance = read_json(files["acceptance.json"])
    item = registry_by_key().get(installation.get("workflowKey"))
    if not item or item.get("stage") != "APPROVED_BASELINE":
        errors.append("workflow is no longer an APPROVED_BASELINE registry entry")
        return {"ready": False, "target": target, "blockers": errors}

    errors.extend(assert_safe_tree(config, "$.config"))
    errors.extend(assert_safe_tree(connectors, "$.connectors"))
    for key in required_config_missing(bundle, item):
        errors.append(f"required config missing: {key}")

    requirements = connector_requirements().get(item["key"], [])
    by_capability = {binding.get("capability"): binding for binding in connectors.get("bindings", [])}
    for req in requirements:
        binding = by_capability.get(req["capability"])
        if not binding:
            errors.append(f"connector binding missing: {req['capability']}")
            continue
        if binding.get("status") != "verified":
            errors.append(f"connector not verified: {req['capability']}")
        credential_ref = binding.get("credentialRef")
        if not isinstance(credential_ref, str) or not credential_ref.startswith("credref:"):
            errors.append(f"credentialRef must use credref: reference for {req['capability']}")
        if not binding.get("provider"):
            errors.append(f"provider missing: {req['capability']}")
        if not isinstance(binding.get("scopes"), list):
            errors.append(f"scopes must be an array: {req['capability']}")

    baseline_checks = {
        "manual_minutes_per_unit": lambda x: isinstance(x, (int, float)) and x > 0,
        "baseline_sample_size": lambda x: isinstance(x, int) and x > 0,
        "baseline_method": lambda x: x in {"time_study", "system_data", "client_declared", "mixed"},
        "loaded_hourly_cost": lambda x: isinstance(x, (int, float)) and x >= 0,
        "confidence": lambda x: x in {"low", "medium", "high"},
    }
    for field, valid in baseline_checks.items():
        if not valid(baseline.get(field)):
            errors.append(f"baseline incomplete/invalid: {field}")

    checks = acceptance.get("checks", {})
    configured_checks = [
        "configReviewed",
        "connectorScopesVerified",
        "baselineAgreed",
        "costPolicyAccepted",
        "rollbackReviewed",
    ]
    accepted_checks = configured_checks + [
        "productionDryRunPassed",
        "clientFixturePassed",
        "clientApprovalRecorded",
    ]
    for check in accepted_checks if target == "CLIENT_ACCEPTED" else configured_checks:
        if checks.get(check) is not True:
            errors.append(f"acceptance check not complete: {check}")

    return {
        "ready": not errors,
        "target": target,
        "installationId": installation.get("installationId"),
        "workflowKey": item["key"],
        "tenantId": installation.get("tenantId"),
        "blockers": errors,
    }


def set_binding(bundle: Path, capability: str, provider: str, credential_ref: str, scopes: list[str]) -> None:
    if not credential_ref.startswith("credref:"):
        raise ValueError("credential_ref must start with credref:")
    path = bundle / "connector-bindings.json"
    doc = read_json(path)
    for binding in doc.get("bindings", []):
        if binding.get("capability") == capability:
            binding.update({
                "provider": provider,
                "credentialRef": credential_ref,
                "scopes": scopes,
                "status": "verified",
            })
            write_json(path, doc)
            return
    raise ValueError(f"unknown connector capability for bundle: {capability}")


def set_baseline(bundle: Path, args: argparse.Namespace) -> None:
    path = bundle / "savings-baseline.json"
    doc = read_json(path)
    doc.update({
        "status": "AGREED",
        "manual_minutes_per_unit": args.manual_minutes,
        "baseline_sample_size": args.sample_size,
        "baseline_method": args.method,
        "loaded_hourly_cost": args.hourly_cost,
        "currency": args.currency,
        "confidence": args.confidence,
        "agreedAt": args.agreed_at or now_iso(),
    })
    write_json(path, doc)


def set_check(bundle: Path, check: str, value: bool = True) -> None:
    path = bundle / "acceptance.json"
    doc = read_json(path)
    if check not in doc.get("checks", {}):
        raise ValueError(f"unknown acceptance check: {check}")
    doc["checks"][check] = value
    write_json(path, doc)


def promote(bundle: Path, target: str, at: str | None = None) -> dict:
    diagnosis = diagnose(bundle, target)
    if not diagnosis["ready"]:
        raise ValueError("promotion blocked:\n- " + "\n- ".join(diagnosis["blockers"]))
    path = bundle / "installation.json"
    doc = read_json(path)
    doc["state"] = target
    at = at or now_iso()
    if target == "CLIENT_CONFIGURED":
        doc["configuredAt"] = at
    elif target == "CLIENT_ACCEPTED":
        if not doc.get("configuredAt"):
            doc["configuredAt"] = at
        doc["acceptedAt"] = at
    write_json(path, doc)
    return doc


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)

    ls = sub.add_parser("list")
    ls.add_argument("--json", action="store_true")

    sc = sub.add_parser("scaffold")
    sc.add_argument("--workflow", required=True)
    sc.add_argument("--tenant", required=True)
    sc.add_argument("--out", type=Path, default=ROOT / ".local/installations")
    sc.add_argument("--created-at")

    doc = sub.add_parser("doctor")
    doc.add_argument("--bundle", type=Path, required=True)
    doc.add_argument("--target", choices=["CLIENT_CONFIGURED", "CLIENT_ACCEPTED"], default="CLIENT_CONFIGURED")
    doc.add_argument("--json", action="store_true")

    bind = sub.add_parser("bind")
    bind.add_argument("--bundle", type=Path, required=True)
    bind.add_argument("--capability", required=True)
    bind.add_argument("--provider", required=True)
    bind.add_argument("--credential-ref", required=True)
    bind.add_argument("--scope", action="append", default=[])

    base = sub.add_parser("baseline")
    base.add_argument("--bundle", type=Path, required=True)
    base.add_argument("--manual-minutes", type=float, required=True)
    base.add_argument("--sample-size", type=int, required=True)
    base.add_argument("--method", choices=["time_study", "system_data", "client_declared", "mixed"], required=True)
    base.add_argument("--hourly-cost", type=float, required=True)
    base.add_argument("--currency", default="PEN")
    base.add_argument("--confidence", choices=["low", "medium", "high"], required=True)
    base.add_argument("--agreed-at")

    chk = sub.add_parser("check")
    chk.add_argument("--bundle", type=Path, required=True)
    chk.add_argument("--name", required=True)
    chk.add_argument("--false", action="store_true")

    pro = sub.add_parser("promote")
    pro.add_argument("--bundle", type=Path, required=True)
    pro.add_argument("--to", choices=["CLIENT_CONFIGURED", "CLIENT_ACCEPTED"], required=True)
    pro.add_argument("--at")

    return ap


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "list":
            items = [
                {"key": item["key"], "version": item["version"], "name": item["name"], "domain": item["domain"]}
                for item in approved_entries()
            ]
            if args.json:
                print(json.dumps(items, indent=2))
            else:
                for item in items:
                    print(f"{item['key']}@{item['version']}\t{item['domain']}\t{item['name']}")
            return 0

        if args.command == "scaffold":
            path = scaffold(args.workflow, args.tenant, args.out, args.created_at)
            print(path)
            return 0

        if args.command == "doctor":
            result = diagnose(args.bundle, args.target)
            if args.json:
                print(json.dumps(result, indent=2))
            else:
                print("READY" if result["ready"] else "BLOCKED")
                for blocker in result["blockers"]:
                    print(f"- {blocker}")
            return 0 if result["ready"] else 2

        if args.command == "bind":
            set_binding(args.bundle, args.capability, args.provider, args.credential_ref, args.scope)
            print("binding=verified")
            return 0

        if args.command == "baseline":
            set_baseline(args.bundle, args)
            print("baseline=agreed")
            return 0

        if args.command == "check":
            set_check(args.bundle, args.name, not args.false)
            print(f"{args.name}={str(not args.false).lower()}")
            return 0

        if args.command == "promote":
            result = promote(args.bundle, args.to, args.at)
            print(json.dumps(result, indent=2))
            return 0

    except (ValueError, FileExistsError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    return 1


if __name__ == "__main__":
    sys.exit(main())
