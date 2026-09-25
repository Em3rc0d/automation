#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SELECTED = ROOT / "w-savings-p0" / "SELECTED-WORKFLOWS.json"
REGISTRY = ROOT / "workflows" / "SAVINGS-WORKFLOW-REGISTRY.json"

REQUIRED_RUNTIME = [
    "runtime/savings-p0/package.json",
    "runtime/savings-p0/RUNTIME-PROFILE.md",
    "runtime/savings-p0/ADAPTERS.md",
    "runtime/savings-p0/src/runtime.js",
    "runtime/savings-p0/src/retry.js",
    "runtime/savings-p0/src/stores.js",
    "runtime/savings-p0/src/savings.js",
    "runtime/savings-p0/src/adapters/memory-table.js",
    "runtime/savings-p0/src/adapters/memory-message.js",
    "runtime/savings-p0/src/adapters/memory-calendar.js",
    "runtime/savings-p0/src/workflows/payment-reminder.js",
    "runtime/savings-p0/src/workflows/appointment-reminder.js",
    "runtime/savings-p0/src/workflows/lead-followup.js",
    "runtime/savings-p0/test/runtime.test.js",
    "runtime/savings-p0/test/payment-reminder.test.js",
    "runtime/savings-p0/test/appointment-reminder.test.js",
    "runtime/savings-p0/test/lead-followup.test.js",
    "runtime/savings-p0/demo/payment-reminder/run.js",
    "runtime/savings-p0/demo/appointment-reminder/run.js",
    "runtime/savings-p0/demo/lead-followup/run.js",
]

def main() -> int:
    errors: list[str] = []
    selected = json.loads(SELECTED.read_text(encoding="utf-8"))
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    items = selected.get("workflows", [])
    if len(items) != 12:
        errors.append(f"expected 12 selected workflows, got {len(items)}")
    keys = [item.get("key") for item in items]
    if len(keys) != len(set(keys)):
        errors.append("duplicate selected workflow key")
    registry_keys = {item["key"] for item in registry["entries"]}
    for key in keys:
        if key not in registry_keys:
            errors.append(f"selected key absent from registry: {key}")
    if not items or items[0].get("key") != "PAYMENT_REMINDER_AUTOMATION":
        errors.append("Payment Reminder must be P0 reference priority 1")

    expected_reference = {
        "PAYMENT_REMINDER_AUTOMATION",
        "APPOINTMENT_REMINDER_AUTOMATION",
        "LEAD_FOLLOWUP_AUTOMATION",
    }
    actual_reference = {item.get("key") for item in items if item.get("status") == "REFERENCE_IMPLEMENTED"}
    if actual_reference != expected_reference:
        errors.append(
            f"reference implementation set mismatch: expected={sorted(expected_reference)} actual={sorted(actual_reference)}"
        )
    for rel in REQUIRED_RUNTIME:
        if not (ROOT / rel).is_file():
            errors.append(f"missing runtime/wave file: {rel}")

    registry_by_key = {item["key"]: item for item in registry["entries"]}
    for key in expected_reference:
        item = registry_by_key[key]
        package = ROOT / "workflows" / "savings" / item["domain"] / f"{key}@{item['version']}"
        manifest = package / "manifest.yaml"
        if not manifest.is_file():
            errors.append(f"reference package missing: {key}")
            continue
        text = manifest.read_text(encoding="utf-8")
        for token in [key, "DESIGN_READY", 'status: "REFERENCE_IMPLEMENTED"', "readyForProduction: false"]:
            if token not in text:
                errors.append(f"{key} manifest missing boundary: {token}")
        if item.get("implementation_status") != "REFERENCE_IMPLEMENTED":
            errors.append(f"{key} registry entry must be REFERENCE_IMPLEMENTED")
        for field in ["implementation_reference", "reference_test", "reference_demo"]:
            rel = item.get(field)
            if not rel or not (ROOT / rel).is_file():
                errors.append(f"{key} missing executable reference field/file: {field}")

    profile = (ROOT / "runtime/savings-p0/RUNTIME-PROFILE.md").read_text(encoding="utf-8") if (ROOT / "runtime/savings-p0/RUNTIME-PROFILE.md").is_file() else ""
    for token in ["NOT YET FACTORY-CERTIFIED", "no `npm install` required", "no network required"]:
        if token not in profile:
            errors.append(f"runtime profile missing boundary: {token}")

    if errors:
        print("W-SAVINGS-P0 VALIDATION: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1
    print("W-SAVINGS-P0 VALIDATION: PASS")
    print("selected=12 reference_implemented=3 paid_runtime_required=false")
    return 0

if __name__ == "__main__":
    sys.exit(main())
