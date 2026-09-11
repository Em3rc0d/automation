#!/usr/bin/env python3
"""Validate repository certification invariants.

This validator proves repository structure/documentation/toolbox-governance invariants only.
It does NOT prove runtime correctness of workflows or MK1 production behavior.
"""

from __future__ import annotations

import re
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_PATHS = [
    "README.md",
    "brainstorming/PRODUCT-THESIS.md",
    "design/PRODUCT-SURFACES.md",
    "design/ROLES-PERMISSIONS.md",
    "architecture/ARCHITECTURE-MK1.md",
    "architecture/DOMAIN-CONTRACTS.md",
    "architecture/CONNECTOR-CONTRACT.md",
    "architecture/SAVINGS-ENGINE.md",
    "decisions/ADR-0001-CONTROL-PLANE-NOT-WORKFLOW-BUILDER.md",
    "decisions/ADR-0002-N8N-AS-INITIAL-ENGINE.md",
    "decisions/ADR-0003-SHARED-TABLE-TENANCY-RLS.md",
    "decisions/ADR-0004-SECRETS-OAUTH-STRATEGY.md",
    "decisions/ADR-0005-SAVINGS-ENGINE-METHODOLOGY.md",
    "decisions/ADR-0006-MONOLITH-FIRST-DEPLOYMENT.md",
    "security/THREAT-MODEL.md",
    "security/CONNECTOR-WEBHOOK-SECURITY.md",
    "security/PII-LOGGING-DATA-HANDLING.md",
    "security/BACKUP-RESTORE-DR.md",
    "security/INCIDENT-RUNBOOK.md",
    "licensing/LICENSE-MATRIX.md",
    "commercial/CATALOG.md",
    "commercial/AUTOMATION-DISCOVERY.md",
    "docs/CLIENT-ONBOARDING-CHECKLIST.md",
    "docs/WORKFLOW-TESTING-STANDARD.md",
    "docs/PRODUCTION-READINESS-CHECKLIST.md",
    "workflows/SMB-CAPABILITY-LIBRARY.md",
    "workflows/CONNECTOR-MATRIX.md",
    "workflows/TOOLBOX-NORTH-STAR.md",
    "workflows/n8n/README.md",
    "workflows/n8n/BASELINE-TARGETS.md",
    "quarries/workflow-quarry/README.md",
    "quarries/workflow-quarry/registry.yaml",
    "quarries/workflow-quarry/MANIFEST.schema.json",
    "quarries/workflow-quarry/STATUS.md",
    "quarries/workflow-quarry/no-pass-verified/README.md",
    "mk0/README.md",
    "mk1/README.md",
    "certification/COVERAGE-MATRIX.md",
    "certification/CAPABILITY-COVERAGE-MAP.md",
    "certification/CRITERIA.md",
]

QUARRY_STAGE_DIRS = [
    "00-discovered",
    "10-license-checked",
    "20-inspected",
    "30-hardened",
    "40-tested",
    "50-approved-baseline",
    "no-pass-verified",
    "mining-batches",
    "tools",
]

APPROVED_PACKAGE_REQUIRED = {
    "workflow.json",
    "manifest.yaml",
    "config.schema.json",
    "README.md",
}

PROVIDER_TOKENS_FORBIDDEN_IN_CAPABILITY_KEYS = {
    "GMAIL", "OUTLOOK", "HUBSPOT", "PIPEDRIVE", "SALESFORCE", "TWILIO",
    "SLACK", "NOTION", "ASANA", "CLICKUP", "AIRTABLE", "QUICKBOOKS",
    "XERO", "SHOPIFY", "WOOCOMMERCE", "STRIPE", "PAYPAL", "GOOGLE_SHEETS",
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def validate() -> list[str]:
    errors: list[str] = []

    for rel in REQUIRED_PATHS:
        if not (ROOT / rel).is_file():
            fail(errors, f"missing required file: {rel}")

    quarry_root = ROOT / "quarries/workflow-quarry"
    for dirname in QUARRY_STAGE_DIRS:
        if not (quarry_root / dirname).exists():
            fail(errors, f"missing quarry stage/directory: {dirname}")

    if (quarry_root / ".external-cache").exists():
        # The local directory may exist in developer clones, but must remain ignored.
        gitignore = read(".gitignore") if (ROOT / ".gitignore").exists() else ""
        if "quarries/workflow-quarry/.external-cache/" not in gitignore:
            fail(errors, ".external-cache exists but is not explicitly ignored")

    if (ROOT / "workflows/SMB-CAPABILITY-LIBRARY.md").is_file():
        text = read("workflows/SMB-CAPABILITY-LIBRARY.md")
        headings = {int(n) for n in re.findall(r"^#\s+(\d+)\.", text, flags=re.MULTILINE)}
        expected = set(range(1, 21))
        if headings != expected:
            fail(errors, f"SMB capability families mismatch: expected 1..20, got {sorted(headings)}")
        if "APPROVED_BASELINE" not in text:
            fail(errors, "capability library must distinguish approved baselines")

    # Toolbox governance: count is never the North Star; coverage + composition are.
    north_star = ROOT / "workflows/TOOLBOX-NORTH-STAR.md"
    if north_star.is_file():
        text = north_star.read_text(encoding="utf-8")
        required_tokens = [
            "CAPABILITY",
            "ADAPTER",
            "POLICY_CONFIG",
            "VERSION",
            "Common Process Coverage",
            "Assembly Coverage",
            "Certification Ratio",
            "Reuse Density",
            "Provider Independence",
            "Duplicate Semantic Rate",
            "W11 is a milestone, not a catalog ceiling",
            "MINING NEVER STOPS; CERTIFICATION REMAINS SELECTIVE",
        ]
        for token in required_tokens:
            if token not in text:
                fail(errors, f"toolbox North Star missing invariant: {token}")
        if "The repository is **not** optimized for workflow count" not in text:
            fail(errors, "toolbox North Star must explicitly reject workflow-count optimization")
        if "There is no target such as `200 workflows` or `300 workflows`" not in text:
            fail(errors, "toolbox North Star must explicitly reject numeric workflow quotas")

    coverage = ROOT / "certification/CAPABILITY-COVERAGE-MAP.md"
    if coverage.is_file():
        text = coverage.read_text(encoding="utf-8")
        family_rows = {int(n) for n in re.findall(r"^\|\s*(\d+)\s*\|", text, flags=re.MULTILINE)}
        expected = set(range(1, 21))
        if not expected.issubset(family_rows):
            fail(errors, f"coverage map missing canonical SMB families: {sorted(expected-family_rows)}")
        for token in [
            "BROAD_TOOLBOX_READY",
            "10/12 reference archetypes",
            "Provider-specific variants are not counted as new capabilities",
            "W11 proves breadth of the current production program",
        ]:
            if token not in text:
                fail(errors, f"capability coverage map missing readiness invariant: {token}")
        reference_archetypes = [
            "Service-sales engine",
            "Document accounting",
            "Quote-to-cash",
            "Appointment/service",
            "Support desk",
            "Client onboarding",
            "Procure-to-pay",
            "Order-to-fulfillment",
            "Employee lifecycle",
            "Smart operations inbox",
            "Management control",
            "Integration operations",
        ]
        for archetype in reference_archetypes:
            if archetype not in text:
                fail(errors, f"coverage map missing reference archetype: {archetype}")

    # Current wave catalogs must remain provider-neutral, unique and classified.
    catalog = ROOT / "waves/catalog.py"
    if catalog.is_file():
        try:
            ns = runpy.run_path(str(catalog))
            iter_capabilities = ns.get("iter_capabilities")
            if not callable(iter_capabilities):
                fail(errors, "waves catalog missing iter_capabilities()")
            else:
                caps = list(iter_capabilities())
                keys = [str(c.get("key", "")) for c in caps]
                if len(keys) != len(set(keys)):
                    fail(errors, "waves catalog contains duplicate capability keys")
                for cap in caps:
                    key = str(cap.get("key", ""))
                    for provider in PROVIDER_TOKENS_FORBIDDEN_IN_CAPABILITY_KEYS:
                        if provider in key:
                            fail(errors, f"provider-specific capability key forbidden; use adapter/config instead: {key}")
                    for required in ["wave", "family", "key", "pattern", "purpose", "risk", "side_effect"]:
                        if required not in cap:
                            fail(errors, f"wave capability missing field {required}: {key or cap}")
        except Exception as exc:
            fail(errors, f"failed to load waves catalog for governance validation: {exc}")

    registry_path = ROOT / "quarries/workflow-quarry/registry.yaml"
    if registry_path.is_file():
        registry = registry_path.read_text(encoding="utf-8")
        required_registry_flags = [
            "failed_gate_is_terminal: false",
            "retain_all_candidate_metadata: true",
            "retain_duplicate_provenance: true",
            "mining_never_stops_when_baseline_work_starts: true",
        ]
        for flag in required_registry_flags:
            if flag not in registry:
                fail(errors, f"workflow quarry registry missing invariant: {flag}")

    # No external raw cache may be committed. A checked-out ignored cache is tolerated.
    for path in ROOT.rglob("*"):
        if path.is_file() and ".external-cache" in path.parts:
            # Cannot determine Git tracking without invoking git; CI does that separately.
            pass

    # Any promoted package under workflows/n8n must be complete.
    n8n_root = ROOT / "workflows/n8n"
    if n8n_root.exists():
        for family in n8n_root.iterdir():
            if not family.is_dir():
                continue
            for package in family.iterdir():
                if not package.is_dir():
                    continue
                files = {p.name for p in package.iterdir() if p.is_file()}
                missing = APPROVED_PACKAGE_REQUIRED - files
                if missing:
                    fail(errors, f"approved package incomplete: {package.relative_to(ROOT)} missing {sorted(missing)}")
                evidence = package / "evidence/TEST-REPORT.md"
                fixtures = package / "fixtures"
                if not evidence.is_file():
                    fail(errors, f"approved package lacks test report: {package.relative_to(ROOT)}")
                if not fixtures.is_dir():
                    fail(errors, f"approved package lacks fixtures: {package.relative_to(ROOT)}")

    # Certification language must preserve level distinction.
    criteria = ROOT / "certification/CRITERIA.md"
    if criteria.is_file():
        text = criteria.read_text(encoding="utf-8")
        for token in ["K0", "W1", "P1", "K0 != W1 != P1"]:
            if token not in text:
                fail(errors, f"certification criteria missing token: {token}")

    return errors


def main() -> int:
    errors = validate()
    if errors:
        print("REPOSITORY CERTIFICATION VALIDATION: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("REPOSITORY CERTIFICATION VALIDATION: PASS")
    print("Scope: structural/documentation/toolbox-governance invariants; runtime W1/P1 remain separate gates.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
