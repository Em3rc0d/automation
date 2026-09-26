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
    "architecture/SAVINGS-WORKFLOW-DOMAIN.md",
    "decisions/ADR-0001-CONTROL-PLANE-NOT-WORKFLOW-BUILDER.md",
    "decisions/ADR-0002-N8N-AS-INITIAL-ENGINE.md",
    "decisions/ADR-0003-SHARED-TABLE-TENANCY-RLS.md",
    "decisions/ADR-0004-SECRETS-OAUTH-STRATEGY.md",
    "decisions/ADR-0005-SAVINGS-ENGINE-METHODOLOGY.md",
    "decisions/ADR-0006-MONOLITH-FIRST-DEPLOYMENT.md",
    "decisions/ADR-0007-PRE-REVENUE-ZERO-FIXED-COST.md",
    "decisions/ADR-0008-SAVINGS-WORKFLOW-PRODUCT-MODEL.md",
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
    "workflows/ACTIVE-WORK-REDUCERS.md",
    "workflows/SAVINGS-WORKFLOW-STANDARD.md",
    "workflows/SAVINGS-WORKFLOW-CATALOG.md",
    "workflows/SAVINGS-WORKFLOW-REGISTRY.json",
    "workflows/SAVINGS-WORKFLOW.schema.json",
    "workflows/savings/README.md",
    "workflows/savings/INDEX.md",
    "workflows/n8n/README.md",
    "workflows/n8n/BASELINE-TARGETS.md",
    "quarries/workflow-quarry/README.md",
    "quarries/workflow-quarry/registry.yaml",
    "quarries/workflow-quarry/MANIFEST.schema.json",
    "quarries/workflow-quarry/STATUS.md",
    "quarries/workflow-quarry/no-pass-verified/README.md",
    "mk0/README.md",
    "mk1/README.md",
    "runtime/README.md",
    "runtime/savings-p0/package.json",
    "runtime/savings-p0/RUNTIME-PROFILE.md",
    "runtime/savings-p0/src/runtime.js",
    "w-savings-p0/README.md",
    ".github/workflows/savings-installation-kit.yml",
    "tools/savings/tests/test_install_approved.py",
    "tools/savings/install_approved.py",
    "operations/savings/runtime/test/run_event_spool.test.mjs",
    "operations/savings/runtime/run_event_spool.mjs",
    "tools/savings/tests/test_deploy_local.py",
    "tools/savings/deploy_local.py",
    "operations/savings/connector-requirements.json",
    "operations/savings/schemas/savings-baseline.schema.json",
    "operations/savings/schemas/installation.schema.json",
    "operations/savings/schemas/connector-bindings.schema.json",
    "operations/savings/schemas/acceptance.schema.json",
    "operations/savings/README.md",
    "operations/savings/runtime/README.md",
    "operations/savings/runtime/run_bundle.mjs",
    "operations/savings/runtime/run_live.mjs",
    "operations/savings/runtime/file-runtime.mjs",
    "operations/savings/runtime/verify_connectors.mjs",
    "operations/savings/runtime/workflow-dispatch.mjs",
    "operations/savings/runtime/fixture.schema.json",
    "connectors/savings/google-workspace/provider-catalog.json",
    "connectors/savings/google-workspace/README.md",
    "connectors/savings/google-workspace/credential-resolver.mjs",
    "connectors/savings/google-workspace/google-client.mjs",
    "connectors/savings/google-workspace/factory.mjs",
    "w-savings-p0/STATUS.md",
    "w-savings-p0/SELECTED-WORKFLOWS.json",
    "w-savings-p0/tools/validate_wave.py",
    ".github/workflows/savings-p0-validation.yml",
    "certification/COVERAGE-MATRIX.md",
    "certification/CAPABILITY-COVERAGE-MAP.md",
    "certification/TOOLBOX-CLOSURE-PLAN.md",
    "certification/TOOLBOX-READINESS-POLICY.json",
    "certification/CRITERIA.md",
    "tools/report_toolbox_readiness.py",
    "factory/tools/scaffold_savings_workflows.py",
    "factory/tools/validate_savings_registry.py",
    "factory/tools/validate_savings_packages.py",
    "factory/tools/validate_savings_hardened.py",
    "factory/tools/validate_savings_tested.py",
    "factory/tools/validate_savings_approved.py",
    "factory/runtime-profiles/zero-deps-node-v1/profile.json",
    "factory/runtime-profiles/zero-deps-node-v1/README.md",
    "factory/runtime-profiles/zero-deps-node-v1/validate_profile.py",
    "factory/runtime-profiles/zero-deps-node-v1/smoke.js",
    "factory/SAVINGS-PACKAGE-CONTRACT.md",
    "factory/tools/validate_savings_hardening_readiness.py",
    "certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md",
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

    north_star = ROOT / "workflows/TOOLBOX-NORTH-STAR.md"
    if north_star.is_file():
        text = north_star.read_text(encoding="utf-8")
        required_tokens = [
            "CAPABILITY", "ADAPTER", "POLICY_CONFIG", "VERSION",
            "Common Process Coverage", "Assembly Coverage", "Certification Ratio",
            "Reuse Density", "Provider Independence", "Duplicate Semantic Rate",
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
            "BROAD_TOOLBOX_READY", "10/12 reference archetypes",
            "Provider-specific variants are not counted as new capabilities",
            "W11 proves breadth of the current production program",
        ]:
            if token not in text:
                fail(errors, f"capability coverage map missing readiness invariant: {token}")
        reference_archetypes = [
            "Service-sales engine", "Document accounting", "Quote-to-cash",
            "Appointment/service", "Support desk", "Client onboarding",
            "Procure-to-pay", "Order-to-fulfillment", "Employee lifecycle",
            "Smart operations inbox", "Management control", "Integration operations",
        ]
        for archetype in reference_archetypes:
            if archetype not in text:
                fail(errors, f"coverage map missing reference archetype: {archetype}")

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
                    purpose = str(cap.get("purpose", ""))
                    if len(purpose) < 60 or key.replace("_", " ").lower() not in purpose.lower():
                        fail(errors, f"wave capability purpose is not sufficiently explicit: {key}")
        except Exception as exc:
            fail(errors, f"failed to load waves catalog for governance validation: {exc}")

    readiness_reporter = ROOT / "tools/report_toolbox_readiness.py"
    if readiness_reporter.is_file():
        try:
            ns = runpy.run_path(str(readiness_reporter))
            report_main = ns.get("main")
            if not callable(report_main):
                fail(errors, "toolbox readiness reporter missing main()")
            elif report_main() != 0:
                fail(errors, "toolbox readiness claim is inconsistent with computed evidence")
        except Exception as exc:
            fail(errors, f"toolbox readiness reporter failed: {exc}")

    closure_plan = ROOT / "certification/TOOLBOX-CLOSURE-PLAN.md"
    if closure_plan.is_file():
        text = closure_plan.read_text(encoding="utf-8")
        for token in [
            "Phase A — finish semantic coverage",
            "Phase B — deepen common composition gaps",
            "Phase C — certification conversion",
            "Phase D — reference assembly certification",
            "Phase E — post-ready evolution",
            "select certified capabilities",
            "rather than",
            "invent new business workflow architecture",
        ]:
            if token not in text:
                fail(errors, f"toolbox closure plan missing invariant: {token}")


    w_savings_p0_validator = ROOT / "w-savings-p0/tools/validate_wave.py"
    if w_savings_p0_validator.is_file():
        try:
            ns = runpy.run_path(str(w_savings_p0_validator))
            wave_main = ns.get("main")
            if not callable(wave_main):
                fail(errors, "W-SAVINGS-P0 validator missing main()")
            elif wave_main() != 0:
                fail(errors, "W-SAVINGS-P0 structural validation failed")
        except Exception as exc:
            fail(errors, f"W-SAVINGS-P0 validator failed: {exc}")

    savings_approved_validator = ROOT / "factory/tools/validate_savings_approved.py"
    if savings_approved_validator.is_file():
        try:
            ns = runpy.run_path(str(savings_approved_validator))
            approved_main = ns.get("main")
            if not callable(approved_main):
                fail(errors, "savings APPROVED_BASELINE validator missing main()")
            elif approved_main() != 0:
                fail(errors, "savings APPROVED_BASELINE validation failed")
        except Exception as exc:
            fail(errors, f"savings APPROVED_BASELINE validator failed: {exc}")

    savings_tested_validator = ROOT / "factory/tools/validate_savings_tested.py"
    if savings_tested_validator.is_file():
        try:
            ns = runpy.run_path(str(savings_tested_validator))
            tested_main = ns.get("main")
            if not callable(tested_main):
                fail(errors, "savings TESTED validator missing main()")
            elif tested_main() != 0:
                fail(errors, "savings TESTED lifecycle validation failed")
        except Exception as exc:
            fail(errors, f"savings TESTED validator failed: {exc}")

    savings_hardened_validator = ROOT / "factory/tools/validate_savings_hardened.py"
    if savings_hardened_validator.is_file():
        try:
            ns = runpy.run_path(str(savings_hardened_validator))
            hardened_main = ns.get("main")
            if not callable(hardened_main):
                fail(errors, "savings HARDENED validator missing main()")
            elif hardened_main() != 0:
                fail(errors, "savings HARDENED lifecycle validation failed")
        except Exception as exc:
            fail(errors, f"savings HARDENED validator failed: {exc}")

    savings_packages_validator = ROOT / "factory/tools/validate_savings_packages.py"
    if savings_packages_validator.is_file():
        try:
            ns = runpy.run_path(str(savings_packages_validator))
            packages_main = ns.get("main")
            if not callable(packages_main):
                fail(errors, "savings package validator missing main()")
            elif packages_main() != 0:
                fail(errors, "savings package materialization validation failed")
        except Exception as exc:
            fail(errors, f"savings package validator failed: {exc}")

    savings_registry_validator = ROOT / "factory/tools/validate_savings_registry.py"
    if savings_registry_validator.is_file():
        try:
            ns = runpy.run_path(str(savings_registry_validator))
            savings_main = ns.get("main")
            if not callable(savings_main):
                fail(errors, "savings workflow registry validator missing main()")
            elif savings_main() != 0:
                fail(errors, "savings workflow registry validation failed")
        except Exception as exc:
            fail(errors, f"savings workflow registry validator failed: {exc}")

    savings_standard = ROOT / "workflows/SAVINGS-WORKFLOW-STANDARD.md"
    if savings_standard.is_file():
        text = savings_standard.read_text(encoding="utf-8")
        for token in [
            "fixed production infrastructure target is approximately S/0",
            "shared multi-tenant runtime",
            "DESIGN_READY",
            "APPROVED_BASELINE",
            "CLIENT_ACCEPTED",
        ]:
            if token not in text:
                fail(errors, f"savings workflow standard missing invariant: {token}")

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

    for path in ROOT.rglob("*"):
        if path.is_file() and ".external-cache" in path.parts:
            pass

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
