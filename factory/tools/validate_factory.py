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
    "factory/runtime/compose.yml",
    "factory/mock/wiremock/mappings/control-plane.json",
    "factory/probes/runtime-probe.json",
    "factory/tools/runtime_smoke.sh",
    "factory/tools/promote.py",
    "factory/tools/record_failure.py",
    "factory/tools/validate_factory.py",
    "factory/CERTIFICATION-CRITERIA.md",
    "factory/STATUS.md",
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
        if "mock-control-plane" not in text:
            errors.append("factory compose lacks mock control plane")

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
            urls = {m.get("request", {}).get("urlPath") for m in data.get("mappings", [])}
            for url in ["/internal/execution-events", "/internal/incidents", "/internal/savings-events", "/internal/approvals", "/healthz"]:
                if url not in urls:
                    errors.append(f"mock control plane missing endpoint: {url}")
        except Exception as exc:
            errors.append(f"invalid WireMock mapping: {exc}")

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

    if errors:
        print("FACTORY VALIDATION: FAIL")
        for err in errors:
            print(f"- {err}")
        return 1

    print("FACTORY VALIDATION: PASS")
    print("Scope: factory configuration/static invariants; runtime gate remains separate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
