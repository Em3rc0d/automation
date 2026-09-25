#!/usr/bin/env python3
"""Validate the materialized Savings Workflow DESIGN_READY skeleton library."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "workflows" / "SAVINGS-WORKFLOW-REGISTRY.json"
LIBRARY = ROOT / "workflows" / "savings"

REQUIRED_FILES = {
    "manifest.yaml",
    "README.md",
    "config.schema.json",
    "contracts/input.schema.json",
    "contracts/output.schema.json",
    "fixtures/happy-path.json",
    "fixtures/duplicate.json",
    "fixtures/provider-error.json",
    "tests/TEST-PLAN.md",
    "savings/BASELINE.md",
    "implementation/flow.plan.yaml",
    "runbook/RUNBOOK.md",
}


def main() -> int:
    errors: list[str] = []
    try:
        doc = json.loads(REGISTRY.read_text(encoding="utf-8"))
        entries = list(doc["entries"])
    except Exception as exc:
        print(f"SAVINGS PACKAGE VALIDATION: FAIL\n- cannot load registry: {exc}")
        return 1

    expected_paths: set[Path] = set()

    for item in entries:
        package = LIBRARY / item["domain"] / f"{item['key']}@{item['version']}"
        expected_paths.add(package.resolve())

        if not package.is_dir():
            errors.append(f"missing package: {package.relative_to(ROOT)}")
            continue

        for rel in REQUIRED_FILES:
            target = package / rel
            if not target.is_file():
                errors.append(f"{item['key']} missing {rel}")

        manifest = package / "manifest.yaml"
        if manifest.is_file():
            text = manifest.read_text(encoding="utf-8")
            required_tokens = [
                f'key: "{item["key"]}"',
                f'version: "{item["version"]}"',
                f'stage: "{item["stage"]}"',
                f'runtimeProfile: "{item["runtime_profile"]}"',
                f'savingsUnit: "{item["savings_unit"]}"',
                f'status: "{item.get("implementation_status", "NOT_IMPLEMENTED")}"',
                "readyForProduction: false",
                ("approvedBaseline: true" if item["stage"] in {"APPROVED_BASELINE", "CLIENT_CONFIGURED", "CLIENT_ACCEPTED"} else "approvedBaseline: false"),
            ]
            for token in required_tokens:
                if token not in text:
                    errors.append(f"{item['key']} manifest missing invariant: {token}")

            reference = item.get("implementation_reference")
            if reference:
                if f'reference: "{reference}"' not in text:
                    errors.append(f"{item['key']} manifest missing implementation reference")
                if not (ROOT / reference).is_file():
                    errors.append(f"{item['key']} implementation reference missing: {reference}")
                if item.get("implementation_status") != "REFERENCE_IMPLEMENTED":
                    errors.append(f"{item['key']} implementation reference requires REFERENCE_IMPLEMENTED status")

        for rel in [
            "config.schema.json",
            "contracts/input.schema.json",
            "contracts/output.schema.json",
            "fixtures/happy-path.json",
            "fixtures/duplicate.json",
            "fixtures/provider-error.json",
        ]:
            target = package / rel
            if target.is_file():
                try:
                    json.loads(target.read_text(encoding="utf-8"))
                except Exception as exc:
                    errors.append(f"{item['key']} invalid JSON {rel}: {exc}")

        flow = package / "implementation/flow.plan.yaml"
        if flow.is_file():
            text = flow.read_text(encoding="utf-8")
            if item["key"] not in text:
                errors.append(f"{item['key']} flow plan key mismatch")
            if item["runtime_profile"] not in text:
                errors.append(f"{item['key']} flow plan runtime mismatch")
            expected_implementation_status = item.get("implementation_status", "NOT_IMPLEMENTED")
            if expected_implementation_status not in text:
                errors.append(f"{item['key']} flow plan implementation status mismatch")
            for capability in item["capabilities"]:
                if capability not in text:
                    errors.append(f"{item['key']} flow plan missing capability {capability}")

        baseline = package / "savings/BASELINE.md"
        if baseline.is_file():
            text = baseline.read_text(encoding="utf-8")
            if item["savings_unit"] not in text:
                errors.append(f"{item['key']} baseline missing savings unit")
            for token in ["manual_minutes_per_unit", "automated_units", "exception_minutes", "oversight_minutes", "variable_cost"]:
                if token not in text:
                    errors.append(f"{item['key']} baseline missing metric {token}")

        if (package / "workflow.json").exists():
            errors.append(f"{item['key']} code-first package must not contain fake workflow.json")

        if item["stage"] in {"HARDENED", "TESTED", "APPROVED_BASELINE", "CLIENT_CONFIGURED", "CLIENT_ACCEPTED"}:
            hardening_report = package / "evidence/HARDENING-REPORT.md"
            if not hardening_report.is_file():
                errors.append(f"{item['key']} {item['stage']} package missing evidence/HARDENING-REPORT.md")

        if item["stage"] in {"TESTED", "APPROVED_BASELINE", "CLIENT_CONFIGURED", "CLIENT_ACCEPTED"}:
            test_report = package / "evidence/TEST-REPORT.md"
            if not test_report.is_file():
                errors.append(f"{item['key']} {item['stage']} package missing evidence/TEST-REPORT.md")

    actual_paths: set[Path] = set()
    if LIBRARY.exists():
        for domain in LIBRARY.iterdir():
            if not domain.is_dir():
                continue
            for child in domain.iterdir():
                if child.is_dir() and "@" in child.name:
                    actual_paths.add(child.resolve())

    missing = expected_paths - actual_paths
    orphan = actual_paths - expected_paths
    if missing:
        errors.append(f"materialized package count missing={len(missing)}")
    if orphan:
        errors.append("orphan package directories: " + ", ".join(str(p.relative_to(ROOT)) for p in sorted(orphan)))

    if len(actual_paths) != len(entries):
        errors.append(f"package count mismatch registry={len(entries)} materialized={len(actual_paths)}")

    index = LIBRARY / "INDEX.md"
    if not index.is_file():
        errors.append("missing workflows/savings/INDEX.md")
    else:
        text = index.read_text(encoding="utf-8")
        if f"Workflow skeletons: **{len(entries)}**" not in text:
            errors.append("INDEX.md workflow count does not match registry")

    domains = {item["domain"] for item in entries}
    for domain in domains:
        if not (LIBRARY / domain / "README.md").is_file():
            errors.append(f"domain index missing: workflows/savings/{domain}/README.md")

    if errors:
        print("SAVINGS PACKAGE VALIDATION: FAIL")
        for err in errors:
            print(f"- {err}")
        return 1

    print("SAVINGS PACKAGE VALIDATION: PASS")
    print(f"registry_entries={len(entries)} materialized_packages={len(actual_paths)}")
    print(f"package_contract_files={len(REQUIRED_FILES)} domains={len(domains)}")
    print("scope=lifecycle-aware materialized package structure")
    return 0


if __name__ == "__main__":
    sys.exit(main())
