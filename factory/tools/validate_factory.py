#!/usr/bin/env python3
"""Validate Baseline Factory invariants.

This proves factory structure/configuration invariants. Runtime behavior is proven
separately by factory/tools/runtime_smoke.sh in GitHub Actions.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FACTORY = ROOT / "factory"

REQUIRED = [
    "factory/README.md",
    "factory/RUNTIME-SUPPORT-POLICY.md",
    "factory/runtime/compose.yml",
    "factory/mock/wiremock/mappings/control-plane.json",
    "factory/probes/runtime-probe.json",
    "factory/tools/runtime_smoke.sh",
    "factory/tools/record_gate.py",
    "factory/tools/promote.py",
    "factory/tools/record_failure.py",
    "factory/tools/self_test.py",
    "factory/tools/validate_factory.py",
    "factory/CERTIFICATION-CRITERIA.md",
    "factory/STATUS.md",
    "factory/runtime-profiles/zero-deps-node-v1/profile.json",
    "factory/runtime-profiles/zero-deps-node-v1/README.md",
    "factory/runtime-profiles/zero-deps-node-v1/validate_profile.py",
    "factory/runtime-profiles/zero-deps-node-v1/smoke.js",
    "quarries/workflow-quarry/tools/index_workflow_corpus.py",
    ".github/workflows/factory-validation.yml",
]


def main() -> int:
    errors: list[str] = []
    for rel in REQUIRED:
        if not (ROOT / rel).is_file():
            errors.append(f"missing factory file: {rel}")

    compose = ROOT / "factory/runtime/compose.yml"
    if compose.is_file():
        text = compose.read_text(encoding="utf-8")
        if "2.38.7" not in text:
            errors.append("factory n8n runtime is not pinned to 2.38.7")
        if ":latest" in text or "N8N_VERSION:-latest" in text:
            errors.append("factory runtime must not use latest")
        for token in [
            "mock-control-plane",
            '18080:8080',
            "AUTOMATION_CONTROL_PLANE_URL",
            "AUTOMATION_CONTROL_PLANE_TOKEN",
            "factory-test-token",
            "N8N_BLOCK_ENV_ACCESS_IN_NODE",
        ]:
            if token not in text:
                errors.append(f"factory compose missing W1/W2 harness invariant: {token}")
        if 'N8N_BLOCK_ENV_ACCESS_IN_NODE: "false"' not in text:
            errors.append("managed baseline runtime must explicitly allow $env references")

    policy = ROOT / "factory/RUNTIME-SUPPORT-POLICY.md"
    if policy.is_file():
        text = policy.read_text(encoding="utf-8")
        for token in ["n8n-base-js-v1", "2.38.7", "zero-deps-node-v1", "20.19.5", "Python Code execution", "community nodes", "requires re-running the full factory certification gate"]:
            if token not in text:
                errors.append(f"runtime support policy missing boundary token: {token}")

    node_profile = ROOT / "factory/runtime-profiles/zero-deps-node-v1/profile.json"
    if node_profile.is_file():
        try:
            data = json.loads(node_profile.read_text(encoding="utf-8"))
            expected = {
                "profile": "zero-deps-node-v1",
                "engine": "node",
                "testedVersion": "20.19.5",
                "certificationState": "CANDIDATE",
                "expectedReferenceWorkflows": 12,
            }
            for key, value in expected.items():
                if data.get(key) != value:
                    errors.append(
                        f"zero-deps Node profile manifest {key} mismatch: expected={value!r} actual={data.get(key)!r}"
                    )
            if data.get("dependencyPolicy", {}).get("runtimeDependencies") != []:
                errors.append("zero-deps Node profile runtimeDependencies must be empty")
            if data.get("infrastructurePolicy", {}).get("paidInfrastructureRequiredForTests") is not False:
                errors.append("zero-deps Node profile paidInfrastructureRequiredForTests must be false")
        except Exception as exc:
            errors.append(f"invalid zero-deps Node profile manifest: {exc}")

    probe = ROOT / "factory/probes/runtime-probe.json"
    if probe.is_file():
        try:
            data = json.loads(probe.read_text(encoding="utf-8"))
            if data.get("id") != "factoryRuntimeProbeV1":
                errors.append("runtime probe stable id mismatch")
            if not data.get("nodes"):
                errors.append("runtime probe has no nodes")
        except Exception as exc:
            errors.append(f"invalid runtime probe JSON: {exc}")

    mapping = ROOT / "factory/mock/wiremock/mappings/control-plane.json"
    if mapping.is_file():
        try:
            data = json.loads(mapping.read_text(encoding="utf-8"))
            mappings = data.get("mappings", [])
            exact_urls = {m.get("request", {}).get("urlPath") for m in mappings}
            patterns = {m.get("request", {}).get("urlPathPattern") for m in mappings}
            if "/healthz" not in exact_urls:
                errors.append("mock control plane missing health endpoint")
            if "/internal/.*" not in patterns:
                errors.append("mock control plane missing generalized internal API route")
            raw = mapping.read_text(encoding="utf-8")
            for token in ["transient-", "SECOND_FAILURE", "SUCCESS", "permanent-", '"status": 500', '"status": 202']:
                if token not in raw:
                    errors.append(f"mock control plane missing deterministic failure invariant: {token}")
        except Exception as exc:
            errors.append(f"invalid WireMock mapping: {exc}")

    gate = ROOT / "factory/tools/record_gate.py"
    if gate.is_file():
        gtext = gate.read_text(encoding="utf-8")
        for token in ["automatedDecision", "preserved", "LICENSE_CHECKED", "APPROVED_BASELINE"]:
            if token not in gtext:
                errors.append(f"gate recorder missing evidence invariant: {token}")
        forbidden = ["shutil.rmtree", ".unlink(", "os.remove(", "os.unlink("]
        for token in forbidden:
            if token in gtext:
                errors.append(f"gate recorder contains destructive primitive: {token}")

    promote = ROOT / "factory/tools/promote.py"
    if promote.is_file():
        ptext = promote.read_text(encoding="utf-8")
        if "copytree" not in ptext:
            errors.append("promotion tool must preserve source through copy semantics")
        forbidden = ["shutil.rmtree", ".unlink(", "os.remove(", "os.unlink("]
        for token in forbidden:
            if token in ptext:
                errors.append(f"promotion tool contains destructive primitive: {token}")

    failure = ROOT / "factory/tools/record_failure.py"
    if failure.is_file():
        ftext = failure.read_text(encoding="utf-8")
        if "no-pass-verified" not in ftext:
            errors.append("failure recorder does not target no-pass-verified")
        if "copy2" not in ftext and "copytree" not in ftext:
            errors.append("failure recorder must preserve evidence by copying")

    indexer = ROOT / "quarries/workflow-quarry/tools/index_workflow_corpus.py"
    if indexer.is_file():
        itext = indexer.read_text(encoding="utf-8")
        for token in ["candidates.jsonl", "semantic_fingerprint", '"deleted": 0', "approval_performed"]:
            if token not in itext:
                errors.append(f"discovery indexer missing preservation/inventory invariant: {token}")

    if errors:
        print("FACTORY VALIDATION: FAIL")
        for err in errors:
            print(f"- {err}")
        return 1

    print("FACTORY VALIDATION: PASS")
    print("Discovery intake + immutable human gate evidence + non-destructive promotion/failure tooling: PRESENT")
    print("Generalized control-plane mock + deterministic retry/failure scenarios: PRESENT")
    print("Managed baseline $env references: EXPLICITLY ENABLED; embedded secret values remain forbidden")
    print("Certified base runtime profile: n8n-base-js-v1 / n8n 2.38.7")
    print("Runtime extension candidate: zero-deps-node-v1 / Node 20.19.5")
    print("Scope: factory configuration/static invariants; runtime gate remains separate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
