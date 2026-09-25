#!/usr/bin/env python3
"""Validate canonical APPROVED_BASELINE records for W-SAVINGS-P0."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SELECTED = ROOT / "w-savings-p0/SELECTED-WORKFLOWS.json"
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"

TESTED_SOURCE_COMMIT = "f7dc2478855ac06dd9aaabbbae4e8a3657365802"
TEST_EVIDENCE_SHA = "c4488c852261d09f54561a623f4f96296280e096"
TEST_RUN_ID = 36089328606
TEST_JOB_ID = 107928100134


def main() -> int:
    errors: list[str] = []
    selected = json.loads(SELECTED.read_text(encoding="utf-8"))["workflows"]
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))["entries"]
    by_key = {item["key"]: item for item in registry}
    approved_paths: set[str] = set()

    for chosen in selected:
        key = chosen["key"]
        item = by_key[key]
        if item.get("stage") not in {"APPROVED_BASELINE", "CLIENT_CONFIGURED", "CLIENT_ACCEPTED"}:
            errors.append(f"{key} must be at least APPROVED_BASELINE")
            continue

        approval = item.get("approval") or {}
        expected = {
            "decision": "APPROVED_BASELINE",
            "mechanism": "repository_pull_request_merge_to_main",
            "tested_source_commit": TESTED_SOURCE_COMMIT,
            "test_evidence_sha": TEST_EVIDENCE_SHA,
            "test_run_id": TEST_RUN_ID,
            "test_job_id": TEST_JOB_ID,
            "runtime_profile": "zero-deps-node-v1",
        }
        for field, value in expected.items():
            if approval.get(field) != value:
                errors.append(f"{key} approval.{field} expected={value!r} actual={approval.get(field)!r}")

        record_rel = approval.get("baseline_record")
        promo_rel = approval.get("promotion_evidence")
        if not record_rel or record_rel in approved_paths:
            errors.append(f"{key} baseline record missing or duplicated: {record_rel}")
            continue
        approved_paths.add(record_rel)

        record_path = ROOT / record_rel
        promo_path = ROOT / promo_rel if promo_rel else None
        if not record_path.is_file():
            errors.append(f"{key} missing approved record: {record_rel}")
            continue
        if not promo_path or not promo_path.is_file():
            errors.append(f"{key} missing promotion evidence: {promo_rel}")
            continue

        record = json.loads(record_path.read_text(encoding="utf-8"))
        checks = {
            "key": key,
            "version": item["version"],
            "lifecycleStage": "APPROVED_BASELINE",
            "packagePath": f"workflows/savings/{item['domain']}/{key}@{item['version']}",
            "implementationReference": item["implementation_reference"],
            "runtimeProfile": "zero-deps-node-v1",
            "savingsUnit": item["savings_unit"],
            "clientGateRequired": True,
            "immutableVersion": True,
            "approvalMechanism": "repository_pull_request_merge_to_main",
        }
        for field, value in checks.items():
            if record.get(field) != value:
                errors.append(f"{key} APPROVED.json {field} expected={value!r} actual={record.get(field)!r}")

        tested = record.get("testedSnapshot") or {}
        for field, value in {
            "sourceCommit": TESTED_SOURCE_COMMIT,
            "evidenceSha": TEST_EVIDENCE_SHA,
            "runId": TEST_RUN_ID,
            "jobId": TEST_JOB_ID,
            "tests": 44,
            "passed": 44,
            "failed": 0,
        }.items():
            if tested.get(field) != value:
                errors.append(f"{key} approved testedSnapshot.{field} mismatch")

        promotion = promo_path.read_text(encoding="utf-8")
        for token in [
            "Decision: **APPROVED_BASELINE**",
            TESTED_SOURCE_COMMIT,
            TEST_EVIDENCE_SHA,
            "repository pull request",
            "CLIENT_ACCEPTED",
            "immutable",
        ]:
            if token not in promotion:
                errors.append(f"{key} PROMOTION.md missing {token!r}")

        package = ROOT / "workflows/savings" / item["domain"] / f"{key}@{item['version']}"
        manifest = (package / "manifest.yaml").read_text(encoding="utf-8")
        for token in [
            'stage: "APPROVED_BASELINE"',
            "approvedBaseline: true",
            'decision: "APPROVED_BASELINE"',
            f'testedSourceCommit: "{TESTED_SOURCE_COMMIT}"',
            f'testEvidenceSha: "{TEST_EVIDENCE_SHA}"',
        ]:
            if token not in manifest:
                errors.append(f"{key} manifest missing approved token {token!r}")

    if len(approved_paths) != 12:
        errors.append(f"expected 12 unique approved baseline records, got {len(approved_paths)}")

    if errors:
        print("SAVINGS APPROVED BASELINE VALIDATION: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("SAVINGS APPROVED BASELINE VALIDATION: PASS")
    print("workflows=12 stage=APPROVED_BASELINE immutable_records=12")
    print(f"tested_source_commit={TESTED_SOURCE_COMMIT}")
    print("client_gate_required=true paid_infrastructure_implied=false")
    return 0


if __name__ == "__main__":
    sys.exit(main())
