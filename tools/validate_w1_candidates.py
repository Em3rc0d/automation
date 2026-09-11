#!/usr/bin/env python3
"""Static integrity checks for W1 workflow candidates.

This validator does NOT certify business/runtime behavior. It verifies that
candidates in 30-hardened are packaged consistently, carry stable engine IDs,
do not carry bound credentials, and fit the currently certified factory runtime
profile `n8n-base-js-v1`.
"""

from __future__ import annotations

import json
import re
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

STABLE_WORKFLOW_ID = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{5,127}$")
CERTIFIED_RUNTIME_PROFILE = "n8n-base-js-v1"
CERTIFIED_N8N_VERSION = "2.38.7"


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def candidate_dirs(root: Path):
    if not root.exists():
        return
    for workflow in root.rglob("workflow.json"):
        yield workflow.parent


def load_workflow(package: Path, errors: list[str]) -> dict | None:
    try:
        return json.loads((package / "workflow.json").read_text(encoding="utf-8"))
    except Exception as exc:
        fail(errors, f"invalid workflow JSON: {package.relative_to(ROOT)}: {exc}")
        return None


def uses_unsupported_python(node: dict) -> bool:
    if node.get("type") != "n8n-nodes-base.code":
        return False
    params = node.get("parameters") or {}
    language = str(params.get("language", "")).strip().lower()
    if language.startswith("python"):
        return True
    if any(key in params for key in ("pythonCode", "pythonNativeCode")):
        return True
    return False


def validate_workflow_json(package: Path, errors: list[str], seen_ids: dict[str, Path]) -> None:
    data = load_workflow(package, errors)
    if data is None:
        return

    workflow_id = data.get("id")
    if not isinstance(workflow_id, str) or not STABLE_WORKFLOW_ID.fullmatch(workflow_id):
        fail(errors, f"workflow requires stable top-level n8n id: {package.relative_to(ROOT)}")
    elif workflow_id in seen_ids:
        fail(
            errors,
            f"duplicate workflow id {workflow_id!r}: {seen_ids[workflow_id].relative_to(ROOT)} and {package.relative_to(ROOT)}",
        )
    else:
        seen_ids[workflow_id] = package

    if not isinstance(data.get("nodes"), list) or not data["nodes"]:
        fail(errors, f"workflow has no nodes: {package.relative_to(ROOT)}")

    if not isinstance(data.get("connections"), dict):
        fail(errors, f"workflow has no connections object: {package.relative_to(ROOT)}")

    node_ids: set[str] = set()
    for node in data.get("nodes", []):
        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id:
            fail(errors, f"node missing stable id: {package.relative_to(ROOT)} node={node.get('name')!r}")
        elif node_id in node_ids:
            fail(errors, f"duplicate node id {node_id!r}: {package.relative_to(ROOT)}")
        else:
            node_ids.add(node_id)

        credentials = node.get("credentials")
        if credentials:
            fail(
                errors,
                f"bound n8n credential reference in hardened candidate: "
                f"{package.relative_to(ROOT)} node={node.get('name')!r}",
            )

        node_type = str(node.get("type", ""))
        if not node_type.startswith("n8n-nodes-base."):
            fail(
                errors,
                f"unsupported node package for {CERTIFIED_RUNTIME_PROFILE}: "
                f"{package.relative_to(ROOT)} node={node.get('name')!r} type={node_type!r}",
            )

        if uses_unsupported_python(node):
            fail(
                errors,
                f"Python Code node requires a separately certified runtime profile: "
                f"{package.relative_to(ROOT)} node={node.get('name')!r}",
            )

    meta = data.get("meta", {})
    if meta.get("stage") != "HARDENED":
        fail(errors, f"workflow meta.stage must be HARDENED: {package.relative_to(ROOT)}")
    if not meta.get("origin"):
        fail(errors, f"workflow meta.origin missing: {package.relative_to(ROOT)}")


def validate_hardened(package: Path, errors: list[str], seen_ids: dict[str, Path]) -> None:
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
        required_tokens = [
            "stage: HARDENED",
            "origin:",
            "idempotency:",
            "promotion:",
            f"profile: {CERTIFIED_RUNTIME_PROFILE}",
            f'tested_version: "{CERTIFIED_N8N_VERSION}"',
        ]
        for token in required_tokens:
            if token not in text:
                fail(errors, f"manifest missing {token!r}: {package.relative_to(ROOT)}")

    config = package / "config.schema.json"
    if config.is_file():
        try:
            json.loads(config.read_text(encoding="utf-8"))
        except Exception as exc:
            fail(errors, f"invalid config schema JSON: {package.relative_to(ROOT)}: {exc}")

    validate_workflow_json(package, errors, seen_ids)


def validate_tested(package: Path, errors: list[str]) -> None:
    report = package / "evidence/TEST-REPORT.md"
    if not report.is_file():
        fail(errors, f"TESTED package lacks TEST-REPORT.md: {package.relative_to(ROOT)}")


def validate() -> list[str]:
    errors: list[str] = []
    seen_ids: dict[str, Path] = {}

    hardened_packages = list(candidate_dirs(HARDENED) or [])
    if not hardened_packages:
        fail(errors, "W1 has no hardened workflow candidates")

    for package in hardened_packages:
        validate_hardened(package, errors, seen_ids)

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
    print("Stable top-level n8n workflow IDs: PASS")
    print(f"Certified runtime profile: {CERTIFIED_RUNTIME_PROFILE} / n8n {CERTIFIED_N8N_VERSION}")
    print("Unsupported Python/community-node candidates: BLOCKED unless separately profiled.")
    print("Scope: static package/runtime-profile integrity; business TESTED/APPROVED gates remain separate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
