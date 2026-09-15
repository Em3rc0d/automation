#!/usr/bin/env python3
"""Static readiness gate for CASE-002.

This is intentionally dependency-free. It checks case contracts/fixtures and the
currently required Kapso adapter packages without claiming runtime/provider
certification.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

CASE = Path(__file__).resolve().parents[1]
ROOT = CASE.parents[1]

EXPECTED_FIXTURES = {
    "F01_FLUID_LEAK_USABLE_PHOTO",
    "F02_FLUID_LEAK_UNUSABLE_PHOTO",
    "F03_SCHEDULED_MAINTENANCE_NO_MEDIA",
    "F04_WARRANTY_COMEBACK",
    "F05_ROADSIDE_ASSISTANCE",
}

CONTRACTS = [
    "service-request.schema.json",
    "evidence.schema.json",
    "visual-assessment.schema.json",
    "triage-decision.schema.json",
]

KAPSO_PACKAGES = [
    "KAPSO_MESSAGE_RECEIVE@1.0",
    "KAPSO_MEDIA_DOWNLOAD@1.0",
    "KAPSO_MESSAGE_SEND@1.0",
]

REQUIRED_PACKAGE_FILES = {
    "workflow.json",
    "manifest.yaml",
    "config.schema.json",
    "README.md",
}


def load_json(path: Path, errors: list[str]):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"invalid JSON {path.relative_to(ROOT)}: {exc}")
        return None


def require(condition: bool, errors: list[str], message: str) -> None:
    if not condition:
        errors.append(message)


def validate() -> list[str]:
    errors: list[str] = []

    for name in CONTRACTS:
        path = CASE / "contracts" / name
        require(path.is_file(), errors, f"missing contract: {path.relative_to(ROOT)}")
        if path.is_file():
            schema = load_json(path, errors)
            if schema:
                require(schema.get("type") == "object", errors, f"contract must be object schema: {name}")
                raw = path.read_text(encoding="utf-8").lower()
                for provider in ("kapso", "openwa"):
                    require(provider not in raw, errors, f"provider leak in case contract {name}: {provider}")

    fixture_path = CASE / "fixtures" / "acceptance-fixtures.json"
    data = load_json(fixture_path, errors) if fixture_path.is_file() else None
    require(data is not None, errors, "missing/invalid acceptance fixtures")
    if data:
        fixtures = data.get("fixtures") or []
        ids = {f.get("id") for f in fixtures}
        require(ids == EXPECTED_FIXTURES, errors, f"fixture set mismatch: {sorted(ids)}")
        for fixture in fixtures:
            fid = fixture.get("id", "<unknown>")
            expected = fixture.get("expected") or {}
            triage = expected.get("triage") or {}
            # This explicit field is the frozen authority boundary for every fixture.
            # `mustNot` is scenario-specific and is not required to redundantly repeat it.
            require(
                triage.get("mechanicalDiagnosisProduced") is False,
                errors,
                f"{fid}: diagnosis invariant missing/true",
            )

    adapter_root = ROOT / "quarries/workflow-quarry/30-hardened/adapters/messaging"
    seen_workflow_ids: set[str] = set()
    for package_name in KAPSO_PACKAGES:
        package = adapter_root / package_name
        require(package.is_dir(), errors, f"missing adapter package: {package.relative_to(ROOT)}")
        if not package.is_dir():
            continue
        files = {p.name for p in package.iterdir() if p.is_file()}
        missing = REQUIRED_PACKAGE_FILES - files
        require(not missing, errors, f"{package_name}: missing package files {sorted(missing)}")
        require((package / "evidence/TEST-PLAN.md").is_file(), errors, f"{package_name}: missing TEST-PLAN.md")
        require((package / "fixtures").is_dir() and any((package / "fixtures").glob("*.json")), errors, f"{package_name}: missing JSON fixtures")

        workflow_path = package / "workflow.json"
        workflow = load_json(workflow_path, errors) if workflow_path.is_file() else None
        if workflow:
            wid = workflow.get("id")
            require(isinstance(wid, str) and wid, errors, f"{package_name}: missing stable workflow id")
            if isinstance(wid, str):
                require(wid not in seen_workflow_ids, errors, f"duplicate workflow id: {wid}")
                seen_workflow_ids.add(wid)
            meta = workflow.get("meta") or {}
            require(meta.get("stage") == "HARDENED", errors, f"{package_name}: meta.stage != HARDENED")
            require(meta.get("artifactClass") == "ADAPTER", errors, f"{package_name}: artifactClass != ADAPTER")
            for node in workflow.get("nodes") or []:
                require(not node.get("credentials"), errors, f"{package_name}: bound credential on node {node.get('name')}")

            raw = workflow_path.read_text(encoding="utf-8").lower()
            require("base64" not in raw, errors, f"{package_name}: base64 serialization found in workflow")

            if package_name == "KAPSO_MESSAGE_SEND@1.0":
                send_nodes = [n for n in workflow.get("nodes") or [] if n.get("name") == "Send Kapso Message"]
                require(len(send_nodes) == 1, errors, "KAPSO_MESSAGE_SEND: send node missing")
                if send_nodes:
                    require(send_nodes[0].get("retryOnFail") is not True, errors, "KAPSO_MESSAGE_SEND: provider send must not auto-retry")

    assembly = (CASE / "assembly.yaml").read_text(encoding="utf-8") if (CASE / "assembly.yaml").is_file() else ""
    require("Kapso" in assembly and "OpenWA" in assembly, errors, "assembly adapter preference missing")
    require("KAPSO_MESSAGE_RECEIVE@1.0" in assembly, errors, "assembly does not bind Kapso receive package")
    require("KAPSO_MEDIA_DOWNLOAD@1.0" in assembly, errors, "assembly does not bind Kapso media package")
    require("KAPSO_MESSAGE_SEND@1.0" in assembly, errors, "assembly does not bind Kapso send package")
    require("READY_TO_TEST_MOCK" in assembly, errors, "assembly is not marked READY_TO_TEST_MOCK")

    require((ROOT / "workflows/adapters/messaging/KAPSO-WHATSAPP.md").is_file(), errors, "Kapso adapter spec missing")
    require((ROOT / "workflows/adapters/messaging/OPENWA-WHATSAPP.md").is_file(), errors, "OpenWA adapter spec missing")
    require((CASE / "TESTING.md").is_file(), errors, "CASE-002 testing runbook missing")
    require((CASE / "runtime/case002-acceptance-probe.json").is_file(), errors, "CASE-002 n8n acceptance probe missing")

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("CASE-002 READINESS: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1
    print("CASE-002 READINESS: PASS")
    print(f"Contracts: {len(CONTRACTS)}")
    print(f"Acceptance fixtures: {len(EXPECTED_FIXTURES)}")
    print(f"Kapso HARDENED adapters: {len(KAPSO_PACKAGES)}")
    print("Provider-neutral case contracts: PASS")
    print("No bound adapter credentials / no base64 workflow serialization: PASS")
    print("Boundary: ready for mock/runtime testing; not a production certification.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
