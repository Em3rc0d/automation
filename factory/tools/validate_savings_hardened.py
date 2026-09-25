#!/usr/bin/env python3
"""Validate canonical HARDENED state for all W-SAVINGS-P0 workflows."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SELECTED = ROOT / "w-savings-p0/SELECTED-WORKFLOWS.json"
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"
PROFILE = ROOT / "factory/runtime-profiles/zero-deps-node-v1/profile.json"
RUNTIME_SHA = "8475fcd95817098c59cd1088b543e4881bd3fe38"


def main() -> int:
    errors: list[str] = []
    selected = json.loads(SELECTED.read_text(encoding="utf-8"))["workflows"]
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))["entries"]
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    by_key = {item["key"]: item for item in registry}

    if profile.get("certificationState") != "CERTIFIED":
        errors.append("zero-deps-node-v1 must be FACTORY-CERTIFIED before HARDENED")
    if profile.get("certification", {}).get("evidenceSha") != RUNTIME_SHA:
        errors.append("runtime certification evidence SHA mismatch")

    for chosen in selected:
        key = chosen["key"]
        item = by_key[key]
        if item.get("stage") not in {"HARDENED", "TESTED", "APPROVED_BASELINE", "CLIENT_CONFIGURED", "CLIENT_ACCEPTED"}:
            errors.append(f"{key} must be at least HARDENED")
            continue

        hardening = item.get("hardening") or {}
        if hardening.get("runtime_profile") != "zero-deps-node-v1":
            errors.append(f"{key} hardening runtime mismatch")
        if hardening.get("runtime_certification_state") != "CERTIFIED":
            errors.append(f"{key} hardening runtime is not certified")
        if hardening.get("runtime_evidence_sha") != RUNTIME_SHA:
            errors.append(f"{key} hardening evidence SHA mismatch")

        package = ROOT / "workflows/savings" / item["domain"] / f"{key}@{item['version']}"
        report = package / "evidence/HARDENING-REPORT.md"
        if not report.is_file():
            errors.append(f"{key} missing HARDENING-REPORT.md")
            continue
        text = report.read_text(encoding="utf-8")
        for token in ["VERDICT: PASS", "HARDENED", "zero-deps-node-v1", RUNTIME_SHA, item["savings_unit"]]:
            if token not in text:
                errors.append(f"{key} hardening report missing {token!r}")

        manifest = (package / "manifest.yaml").read_text(encoding="utf-8")
        for token in [f'stage: "{item["stage"]}"', 'runtimeCertification: "CERTIFIED"', f'runtimeEvidenceSha: "{RUNTIME_SHA}"']:
            if token not in manifest:
                errors.append(f"{key} manifest missing hardened token {token!r}")

    if errors:
        print("SAVINGS HARDENED VALIDATION: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("SAVINGS HARDENED VALIDATION: PASS")
    print("workflows=12 minimum_stage=HARDENED runtime=zero-deps-node-v1")
    print("next=exact-SHA workflow test evidence")
    return 0


if __name__ == "__main__":
    sys.exit(main())
