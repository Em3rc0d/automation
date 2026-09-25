#!/usr/bin/env python3
"""Validate that W-SAVINGS-P0 packages are structurally ready for HARDENED review.

This does not change lifecycle state and does not certify workflow correctness.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SELECTED = ROOT / "w-savings-p0/SELECTED-WORKFLOWS.json"
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"
PROFILE = ROOT / "factory/runtime-profiles/zero-deps-node-v1/profile.json"

REQUIRED = {
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
    "evidence/REFERENCE-EVIDENCE.md",
}

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_-]{16,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
]


def main() -> int:
    errors: list[str] = []
    selected = json.loads(SELECTED.read_text(encoding="utf-8")).get("workflows", [])
    registry = json.loads(REGISTRY.read_text(encoding="utf-8")).get("entries", [])
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    registry_by_key = {item["key"]: item for item in registry}

    if profile.get("profile") != "zero-deps-node-v1":
        errors.append("wrong runtime profile manifest")
    if profile.get("certificationState") not in {"CANDIDATE", "CERTIFIED"}:
        errors.append("runtime profile certificationState must be CANDIDATE or CERTIFIED")

    if len(selected) != 12:
        errors.append(f"expected 12 selected workflows, got {len(selected)}")

    for chosen in selected:
        key = chosen["key"]
        item = registry_by_key.get(key)
        if not item:
            errors.append(f"missing registry entry: {key}")
            continue

        package = ROOT / "workflows/savings" / item["domain"] / f"{key}@{item['version']}"
        if not package.is_dir():
            errors.append(f"missing package: {package.relative_to(ROOT)}")
            continue

        for rel in REQUIRED:
            if not (package / rel).is_file():
                errors.append(f"{key} missing {rel}")

        if (package / "workflow.json").exists():
            errors.append(f"{key} code-first package must not contain fake workflow.json")

        if item.get("implementation_status") != "REFERENCE_IMPLEMENTED":
            errors.append(f"{key} must be REFERENCE_IMPLEMENTED before hardening")
        if item.get("implementation_engine") != "zero-deps-node-v1":
            errors.append(f"{key} wrong implementation engine")

        for field in ["implementation_reference", "reference_test", "reference_demo"]:
            rel = item.get(field)
            if not rel or not (ROOT / rel).is_file():
                errors.append(f"{key} missing reference file {field}")

        manifest = (package / "manifest.yaml").read_text(encoding="utf-8")
        for token in [
            f'key: "{key}"',
            'status: "REFERENCE_IMPLEMENTED"',
            'engine: "zero-deps-node-v1"',
            "readyForProduction: false",
            "approvedBaseline: false",
        ]:
            if token not in manifest:
                errors.append(f"{key} manifest missing {token!r}")

        baseline = (package / "savings/BASELINE.md").read_text(encoding="utf-8")
        for token in [
            item["savings_unit"],
            "manual_minutes_per_unit",
            "automated_units",
            "exception_minutes",
            "oversight_minutes",
            "variable_cost",
        ]:
            if token not in baseline:
                errors.append(f"{key} baseline missing {token!r}")

        test_plan = (package / "tests/TEST-PLAN.md").read_text(encoding="utf-8")
        if item["reference_test"] not in test_plan:
            errors.append(f"{key} test plan does not reference executable test")

        evidence = (package / "evidence/REFERENCE-EVIDENCE.md").read_text(encoding="utf-8")
        for field in ["implementation_reference", "reference_test", "reference_demo"]:
            if item[field] not in evidence:
                errors.append(f"{key} reference evidence missing {field}")

        for rel in [
            "config.schema.json",
            "contracts/input.schema.json",
            "contracts/output.schema.json",
            "fixtures/happy-path.json",
            "fixtures/duplicate.json",
            "fixtures/provider-error.json",
        ]:
            try:
                json.loads((package / rel).read_text(encoding="utf-8"))
            except Exception as exc:
                errors.append(f"{key} invalid JSON {rel}: {exc}")

        for path in package.rglob("*"):
            if not path.is_file():
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for pattern in SECRET_PATTERNS:
                if pattern.search(text):
                    errors.append(f"{key} secret-like material in {path.relative_to(ROOT)}")

    if errors:
        print("SAVINGS HARDENING READINESS: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("SAVINGS HARDENING READINESS: PASS")
    print("reference_packages=12 contract=code-first-savings-v1")
    print(f"runtime_profile=zero-deps-node-v1 state={profile['certificationState']}")
    print("scope=structural readiness only; lifecycle stage unchanged")
    return 0


if __name__ == "__main__":
    sys.exit(main())
