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
    "runtime/savings-p0/test/runtime.test.js",
    "runtime/savings-p0/test/payment-reminder.test.js",
    "runtime/savings-p0/demo/payment-reminder/run.js",
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
    if items and items[0].get("status") != "REFERENCE_IMPLEMENTED":
        errors.append("Payment Reminder must be marked REFERENCE_IMPLEMENTED in wave selection")
    for rel in REQUIRED_RUNTIME:
        if not (ROOT / rel).is_file():
            errors.append(f"missing runtime/wave file: {rel}")

    package = ROOT / "workflows/savings/accounts_receivable/PAYMENT_REMINDER_AUTOMATION@0.1"
    manifest = package / "manifest.yaml"
    if manifest.is_file():
        text = manifest.read_text(encoding="utf-8")
        for token in ["PAYMENT_REMINDER_AUTOMATION", "DESIGN_READY", "readyForProduction: false"]:
            if token not in text:
                errors.append(f"payment reminder manifest missing boundary: {token}")
    else:
        errors.append("payment reminder materialized package missing")

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
    print("selected=12 reference_implemented=1 paid_runtime_required=false")
    return 0

if __name__ == "__main__":
    sys.exit(main())
