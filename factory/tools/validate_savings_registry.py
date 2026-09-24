#!/usr/bin/env python3
"""Validate the Savings Workflow registry without claiming runtime certification."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "workflows" / "SAVINGS-WORKFLOW-REGISTRY.json"

REQUIRED = {
    "id","key","version","domain","name","manual_work_reduced","savings_unit",
    "runtime_profile","capabilities","stage","execution_model","pre_revenue_mode",
    "external_cost_policy","savings_required"
}
RUNTIMES = {"function","scheduled","durable","human_loop","heavy"}


def main() -> int:
    errors: list[str] = []
    try:
        doc = json.loads(REGISTRY.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"SAVINGS REGISTRY VALIDATION: FAIL\n- invalid JSON: {exc}")
        return 1

    entries = doc.get("entries")
    if not isinstance(entries, list):
        errors.append("entries must be an array")
        entries = []

    if doc.get("count") != len(entries):
        errors.append(f"count mismatch: document={doc.get('count')} actual={len(entries)}")

    ids: set[str] = set()
    keys: set[str] = set()
    for i, item in enumerate(entries, 1):
        missing = REQUIRED - set(item)
        if missing:
            errors.append(f"entry {i} missing fields: {sorted(missing)}")
            continue
        if item["id"] in ids:
            errors.append(f"duplicate id: {item['id']}")
        ids.add(item["id"])
        if item["key"] in keys:
            errors.append(f"duplicate key: {item['key']}")
        keys.add(item["key"])
        if item["runtime_profile"] not in RUNTIMES:
            errors.append(f"invalid runtime profile for {item['key']}: {item['runtime_profile']}")
        if item["stage"] != "DESIGN_READY":
            errors.append(f"catalog entry must remain DESIGN_READY until promoted through gates: {item['key']}")
        if item["execution_model"] != "SHARED_MULTI_TENANT":
            errors.append(f"default catalog execution model must be SHARED_MULTI_TENANT: {item['key']}")
        if item["pre_revenue_mode"] != "LOCAL_OR_MOCKED":
            errors.append(f"pre-revenue catalog mode must be LOCAL_OR_MOCKED: {item['key']}")
        if not item["capabilities"]:
            errors.append(f"capabilities empty: {item['key']}")
        if not item["savings_required"]:
            errors.append(f"savings_required must be true: {item['key']}")

    if len(entries) < 100:
        errors.append("catalog unexpectedly small; expected broad solution-level registry")

    if errors:
        print("SAVINGS REGISTRY VALIDATION: FAIL")
        for err in errors:
            print(f"- {err}")
        return 1

    print("SAVINGS REGISTRY VALIDATION: PASS")
    print(f"entries={len(entries)} unique_keys={len(keys)}")
    print("scope=design registry only; no TESTED/APPROVED_BASELINE claim")
    return 0


if __name__ == "__main__":
    sys.exit(main())
