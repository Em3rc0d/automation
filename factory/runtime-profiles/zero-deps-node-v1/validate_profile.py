#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PROFILE_DIR = ROOT / "factory/runtime-profiles/zero-deps-node-v1"
PROFILE = PROFILE_DIR / "profile.json"
PACKAGE = ROOT / "runtime/savings-p0/package.json"
SOURCE = ROOT / "runtime/savings-p0/src"
SELECTED = ROOT / "w-savings-p0/SELECTED-WORKFLOWS.json"
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"

IMPORT_RE = re.compile(r"""(?:from\s+|import\s*\()\s*["']([^"']+)["']""")


def main() -> int:
    errors: list[str] = []

    try:
        profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"ZERO-DEPS NODE PROFILE VALIDATION: FAIL\n- invalid profile.json: {exc}")
        return 1

    expected = {
        "profile": "zero-deps-node-v1",
        "engine": "node",
        "testedVersion": "20.19.5",
        "moduleSystem": "esm",
        "referenceWave": "W-SAVINGS-P0",
        "expectedReferenceWorkflows": 12,
    }
    for key, value in expected.items():
        if profile.get(key) != value:
            errors.append(f"profile {key} mismatch: expected={value!r} actual={profile.get(key)!r}")

    certification_state = profile.get("certificationState")
    if certification_state not in {"CANDIDATE", "CERTIFIED"}:
        errors.append(f"invalid certificationState: {certification_state!r}")

    certificate = ROOT / "certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md"
    certification = profile.get("certification") or {}
    if certification_state == "CERTIFIED":
        if not certificate.is_file():
            errors.append("CERTIFIED profile requires certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md")
        for field in [
            "evidenceSha", "runId", "factoryJobId", "profileJobId",
            "profileArtifactId", "profileArtifactDigest",
            "factoryArtifactId", "factoryArtifactDigest",
        ]:
            if not certification.get(field):
                errors.append(f"CERTIFIED profile missing certification.{field}")

    dependency_policy = profile.get("dependencyPolicy", {})
    if dependency_policy.get("runtimeDependencies") != []:
        errors.append("runtimeDependencies must be empty")
    if dependency_policy.get("devDependencies") != []:
        errors.append("devDependencies must be empty")
    if dependency_policy.get("networkRequiredForTests") is not False:
        errors.append("networkRequiredForTests must be false")
    if dependency_policy.get("networkRequiredForReferenceExecution") is not False:
        errors.append("networkRequiredForReferenceExecution must be false")

    infra = profile.get("infrastructurePolicy", {})
    if infra.get("paidInfrastructureRequiredForTests") is not False:
        errors.append("paidInfrastructureRequiredForTests must be false")
    if infra.get("dedicatedTenantRuntimeRequired") is not False:
        errors.append("dedicatedTenantRuntimeRequired must be false")

    try:
        package = json.loads(PACKAGE.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"invalid runtime package.json: {exc}")
        package = {}

    for key in ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]:
        if package.get(key):
            errors.append(f"runtime package must not declare {key}: {sorted(package[key])}")

    if package.get("type") != "module":
        errors.append("runtime package must use ESM type=module")

    allowed_builtins = set(profile.get("allowedNodeBuiltinsInSource", []))
    forbidden = profile.get("forbiddenSourceCapabilities", [])
    source_files = sorted(SOURCE.rglob("*.js"))
    if not source_files:
        errors.append("runtime source contains no JavaScript files")

    for path in source_files:
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(ROOT)
        for token in forbidden:
            if token in text:
                errors.append(f"forbidden source capability {token!r}: {rel}")
        for match in IMPORT_RE.finditer(text):
            target = match.group(1)
            if target.startswith("."):
                continue
            if target.startswith("node:"):
                if target not in allowed_builtins:
                    errors.append(f"undeclared Node builtin import {target!r}: {rel}")
                continue
            errors.append(f"external package import forbidden: {target!r}: {rel}")

    selected = json.loads(SELECTED.read_text(encoding="utf-8")).get("workflows", [])
    registry = json.loads(REGISTRY.read_text(encoding="utf-8")).get("entries", [])
    registry_by_key = {item["key"]: item for item in registry}

    if len(selected) != 12:
        errors.append(f"expected 12 W-SAVINGS-P0 selections, got {len(selected)}")

    for selected_item in selected:
        key = selected_item.get("key")
        if selected_item.get("status") != "REFERENCE_IMPLEMENTED":
            errors.append(f"selected workflow is not REFERENCE_IMPLEMENTED: {key}")
            continue
        item = registry_by_key.get(key)
        if not item:
            errors.append(f"selected workflow missing from registry: {key}")
            continue
        if item.get("implementation_engine") != "zero-deps-node-v1":
            errors.append(f"wrong implementation engine for {key}: {item.get('implementation_engine')}")
        expected_boundary = (
            "FACTORY_CERTIFIED_RUNTIME"
            if certification_state == "CERTIFIED"
            else "NOT_FACTORY_CERTIFIED"
        )
        if item.get("reference_certification_boundary") != expected_boundary:
            errors.append(
                f"{key} certification boundary mismatch: "
                f"expected={expected_boundary} actual={item.get('reference_certification_boundary')}"
            )
        for field in ["implementation_reference", "reference_test", "reference_demo"]:
            rel = item.get(field)
            if not rel or not (ROOT / rel).is_file():
                errors.append(f"{key} missing reference file: {field}={rel!r}")

    if errors:
        print("ZERO-DEPS NODE PROFILE VALIDATION: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("ZERO-DEPS NODE PROFILE VALIDATION: PASS")
    print(f"profile=zero-deps-node-v1 node=20.19.5 source_files={len(source_files)}")
    print("dependencies=0 network_required=false paid_infrastructure_required=false")
    print(f"reference_workflows=12 certification_state={certification_state}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
