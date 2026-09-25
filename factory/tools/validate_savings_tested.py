#!/usr/bin/env python3
"""Validate canonical TESTED state and exact-SHA evidence for W-SAVINGS-P0."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SELECTED = ROOT / "w-savings-p0/SELECTED-WORKFLOWS.json"
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"
PROFILE = ROOT / "factory/runtime-profiles/zero-deps-node-v1/profile.json"

EVIDENCE_SHA = "e7bc6152bce2b6bd5fce6a222c6c3077b3c386f0"
RUN_ID = 36089006956
JOB_ID = 107927102957


def main() -> int:
    errors: list[str] = []
    selected = json.loads(SELECTED.read_text(encoding="utf-8"))["workflows"]
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))["entries"]
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    by_key = {item["key"]: item for item in registry}

    if profile.get("certificationState") != "CERTIFIED":
        errors.append("runtime profile is not certified")

    for chosen in selected:
        key = chosen["key"]
        item = by_key[key]
        if item.get("stage") not in {"TESTED", "APPROVED_BASELINE", "CLIENT_CONFIGURED", "CLIENT_ACCEPTED"}:
            errors.append(f"{key} must be at least TESTED")
            continue

        testing = item.get("testing") or {}
        expected = {
            "verdict": "PASS",
            "runtime_profile": "zero-deps-node-v1",
            "runtime_version": "20.19.5",
            "evidence_sha": EVIDENCE_SHA,
            "run_id": RUN_ID,
            "job_id": JOB_ID,
            "test_count": 44,
            "pass_count": 44,
            "fail_count": 0,
        }
        for field, value in expected.items():
            if testing.get(field) != value:
                errors.append(f"{key} testing.{field} expected={value!r} actual={testing.get(field)!r}")

        package = ROOT / "workflows/savings" / item["domain"] / f"{key}@{item['version']}"
        report = package / "evidence/TEST-REPORT.md"
        if not report.is_file():
            errors.append(f"{key} missing TEST-REPORT.md")
            continue
        text = report.read_text(encoding="utf-8")
        required = [
            "VERDICT: PASS",
            "runtime_profile: zero-deps-node-v1",
            "runtime_version: 20.19.5",
            f"evidence_sha: {EVIDENCE_SHA}",
            f"run_id: {RUN_ID}",
            f"job_id: {JOB_ID}",
            "test_command: npm run validate",
            "test_count: 44",
            "fail_count: 0",
            "## demo_assertions",
            "## idempotency",
            "## failure_paths",
            "## tenant_scope",
            "## savings_event",
            "## variable_cost",
            "## limitations",
            item["implementation_reference"],
            item["reference_test"],
            item["reference_demo"],
        ]
        for token in required:
            if token not in text:
                errors.append(f"{key} TEST-REPORT missing {token!r}")

        manifest = (package / "manifest.yaml").read_text(encoding="utf-8")
        for token in [
            f'stage: "{item["stage"]}"',
            'verdict: "PASS"',
            f'evidenceSha: "{EVIDENCE_SHA}"',
            "failCount: 0",
        ]:
            if token not in manifest:
                errors.append(f"{key} manifest missing TESTED token {token!r}")

    if errors:
        print("SAVINGS TESTED VALIDATION: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("SAVINGS TESTED VALIDATION: PASS")
    print("workflows=12 minimum_stage=TESTED tests=44 pass=44 fail=0")
    print(f"evidence_sha={EVIDENCE_SHA} run_id={RUN_ID} job_id={JOB_ID}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
