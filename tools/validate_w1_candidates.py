#!/usr/bin/env python3
"""Static integrity checks for W1 workflow candidates.

This validator does NOT certify runtime behavior. It verifies that candidates in
30-hardened are packaged consistently and are not carrying bound n8n credentials.
Runtime promotion remains gated by actual TEST-REPORT evidence.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HARDENED = ROOT / "quarries/workflow-quarry/30-hardened"
TESTED = ROOT / "quarries/workflow-quarry/40-tested"

REQUIRED_HARDENED = {
    "workflow.json",
    "manifest.yaml",
    "config.schema.json",
    "README.md",
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def candidate_dirs(root: Path):
    if not root.exists():
        return
    for workflow in root.rglob("workflow.json"):
        yield workflow.parent


def validate_workflow_json(package: Path, errors: list[str]) -> None:
    workflow_path = package / "workflow.json"
    try:
        data = json.loads(workflow_path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(errors, f"invalid workflow JSON: {package.relative_to(ROOT)}: {exc}")
        return

    if not isinstance(data.get("nodes"), list) or not data["nodes"]:
        fail(errors, f"workflow has no nodes: {package.relative_to(ROOT)}")

    if not isinstance(data.get("connections"), dict):
        fail(errors, f"workflow has no connections object: {package.relative_to(ROOT)}")

    for node in data.get("nodes", []):
        credentials = node.get("credentials")
        if credentials:
            fail(
                errors,
                f"bound n8n credential reference in hardened candidate: "
                f"{package.relative_to(ROOT)} node={node.get('name')!r}",
            )

    meta = data.get("meta", {})
    if meta.get("stage") != "HARDENED":
        fail(errors, f"workflow meta.stage must be HARDENED: {package.relative_to(ROOT)}")
    if not meta.get("origin"):
        fail(errors, f"workflow meta.origin missing: {package.relative_to(ROOT)}")


def validate_hardened(package: Path, errors: list[str]) -> None:
    files = {p.name for p in package.iterdir() if p.is_file()}
    missing = REQUIRED_HARDENED - files
    if missing:
        fail(errors, f"hardened package incomplete: {package.relative_to(ROOT)} missing {sorted(missing)}")

    fixtures = package / "fixtures"
    test_plan = package / "evidence/TEST-PLAN.md"
    if not fixtures.is_dir() or not any(fixtures.glob("*.json")):
        fail(errors, f"hardened package needs JSON fixtures: {package.relative_to(ROOT)}")
    if not test_plan.is_file():
        fail(errors, f"hardened package lacks evidence/TEST-PLAN.md: {package.relative_to(ROOT)}")

    manifest = package / "manifest.yaml"
    if manifest.is_file():
        text = manifest.read_text(encoding="utf-8")
        for token in ["stage: HARDENED", "origin:", "idempotency:", "promotion:"]:
            if token not in text:
                fail(errors, f"manifest missing {token!r}: {package.relative_to(ROOT)}")

    config = package / "config.schema.json"
    if config.is_file():
        try:
            json.loads(config.read_text(encoding="utf-8"))
        except Exception as exc:
            fail(errors, f"invalid config schema JSON: {package.relative_to(ROOT)}: {exc}")

    validate_workflow_json(package, errors)


def validate_tested(package: Path, errors: list[str]) -> None:
    report = package / "evidence/TEST-REPORT.md"
    if not report.is_file():
        fail(errors, f"TESTED package lacks TEST-REPORT.md: {package.relative_to(ROOT)}")


def validate() -> list[str]:
    errors: list[str] = []

    hardened_packages = list(candidate_dirs(HARDENED) or [])
    if not hardened_packages:
        fail(errors, "W1 has no hardened workflow candidates")

    for package in hardened_packages:
        validate_hardened(package, errors)

    for package in candidate_dirs(TESTED) or []:
        validate_tested(package, errors)

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("W1 CANDIDATE VALIDATION: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    count = len(list(candidate_dirs(HARDENED) or []))
    print("W1 CANDIDATE VALIDATION: PASS")
    print(f"Hardened candidates checked: {count}")
    print("Scope: static package integrity only; runtime TESTED/APPROVED gates remain separate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
