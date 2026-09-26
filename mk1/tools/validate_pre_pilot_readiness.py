#!/usr/bin/env python3
"""Validate MK1 repository-side pre-pilot readiness without claiming P1/client evidence."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

REQUIRED_PATHS = [
    "certification/F1-ZERO-DEPS-NODE-V1-CERTIFICATE.md",
    "factory/runtime-profiles/zero-deps-node-v1/profile.json",
    "workflows/SAVINGS-WORKFLOW-REGISTRY.json",
    "workflows/approved/savings",
    "tools/savings/install_approved.py",
    "tools/savings/pilot_bootstrap.py",
    "tools/savings/rehearse_pilot.py",
    "tools/savings/render_rehearsal_html.py",
    "tools/savings/backup_bundle.py",
    "tools/savings/deploy_local.py",
    "operations/savings/runtime/run_bundle.mjs",
    "operations/savings/runtime/verify_connectors.mjs",
    "operations/savings/runtime/run_live.mjs",
    "operations/savings/runtime/run_event_spool.mjs",
    "operations/savings/runtime/file-runtime.mjs",
    "operations/savings/runtime/incident_drill.mjs",
    "connectors/savings/google-workspace/provider-catalog.json",
    "operations/savings/presets/catalog.json",
    "decisions/ADR-0007-PRE-REVENUE-ZERO-FIXED-COST.md",
    "decisions/ADR-0009-MK1-ZERO-COST-REDUCED-SURFACE.md",
    "mk1/rehearsal/pilot-plan.json",
    "mk1/rehearsal/STATIC-SURFACES.md",
    "mk1/ops-hardening/README.md",
]


def load_json(rel: str) -> dict:
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def main() -> int:
    errors: list[str] = []

    for rel in REQUIRED_PATHS:
        if not (ROOT / rel).exists():
            errors.append(f"missing pre-pilot artifact: {rel}")

    if errors:
        print("MK1 PRE-PILOT READINESS: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    registry = load_json("workflows/SAVINGS-WORKFLOW-REGISTRY.json")
    approved = [item for item in registry.get("entries", []) if item.get("stage") == "APPROVED_BASELINE"]
    if len(approved) != 12:
        errors.append(f"expected 12 APPROVED_BASELINE Savings Workflows, got {len(approved)}")

    profile = load_json("factory/runtime-profiles/zero-deps-node-v1/profile.json")
    if profile.get("certificationState") != "CERTIFIED":
        errors.append("zero-deps-node-v1 is not FACTORY-CERTIFIED")
    if profile.get("dependencyPolicy", {}).get("runtimeDependencies") != []:
        errors.append("zero-deps-node-v1 runtime dependencies are not zero")
    if profile.get("infrastructurePolicy", {}).get("paidInfrastructureRequiredForTests") is not False:
        errors.append("certified runtime unexpectedly requires paid test infrastructure")

    selected = load_json("w-savings-p0/SELECTED-WORKFLOWS.json").get("workflows", [])
    selected_keys = {item["key"] for item in selected}
    approved_keys = {item["key"] for item in approved}
    if selected_keys != approved_keys:
        errors.append("approved Savings set does not exactly match W-SAVINGS-P0 selected set")

    provider_catalog = load_json("connectors/savings/google-workspace/provider-catalog.json")
    providers = provider_catalog.get("providers", {})
    for provider in ["google_sheets", "gmail", "google_calendar", "google_drive"]:
        if provider not in providers:
            errors.append(f"Google Workspace provider catalog missing {provider}")

    presets = load_json("operations/savings/presets/catalog.json")
    preset_items = presets.get("presets", presets if isinstance(presets, list) else [])
    if isinstance(preset_items, dict):
        preset_count = len(preset_items)
    elif isinstance(preset_items, list):
        preset_count = len(preset_items)
    else:
        preset_count = 0
    if preset_count < 6:
        errors.append(f"expected at least 6 MYPE pilot presets, got {preset_count}")

    installer = (ROOT / "tools/savings/install_approved.py").read_text(encoding="utf-8")
    for token in [
        "PROTECTED_EVIDENCE_CHECKS",
        "productionDryRunPassed",
        "clientFixturePassed",
        "clientApprovalRecorded",
        "validate_acceptance_evidence",
    ]:
        if token not in installer:
            errors.append(f"installer missing acceptance invariant: {token}")

    live = (ROOT / "operations/savings/runtime/run_live.mjs").read_text(encoding="utf-8")
    for token in [
        "CLIENT_CONFIGURED",
        "CLIENT_ACCEPTED",
        "explicit side-effect confirmation",
        "FileIdempotencyStore",
        "FileAuditControlPlane",
        "LIVE_PROVIDER_EXECUTION",
        "requiresHumanReviewForAcceptance",
    ]:
        if token not in live:
            errors.append(f"live runner missing safety invariant: {token}")

    rehearsal = (ROOT / "tools/savings/rehearse_pilot.py").read_text(encoding="utf-8")
    for token in [
        'productionClaim") is not False',
        "CLIENT_CONFIGURED",
        "LOCAL_SIMULATION",
        "paidInfrastructureRequired",
    ]:
        if token not in rehearsal:
            errors.append(f"MK1 rehearsal missing boundary: {token}")

    renderer = (ROOT / "tools/savings/render_rehearsal_html.py").read_text(encoding="utf-8")
    for token in ["report-manifest.json", "sha256_file", "verify_directory", "productionClaim"]:
        if token not in renderer:
            errors.append(f"static rehearsal renderer missing integrity invariant: {token}")

    backup = (ROOT / "tools/savings/backup_bundle.py").read_text(encoding="utf-8")
    for token in ["sha256", "secretMaterialIncluded", "symlink", "restore_backup"]:
        if token not in backup:
            errors.append(f"backup tooling missing invariant: {token}")

    incident = (ROOT / "operations/savings/runtime/incident_drill.mjs").read_text(encoding="utf-8")
    for token in ["INCIDENT_REHEARSAL", "productionEvidence: false", "savingsEvents", "permanentFailures"]:
        if token not in incident:
            errors.append(f"incident drill missing invariant: {token}")

    adr7 = (ROOT / "decisions/ADR-0007-PRE-REVENUE-ZERO-FIXED-COST.md").read_text(encoding="utf-8")
    if not re.search(r"S/\s*0|S/0|costo fijo", adr7, re.I):
        errors.append("ADR-0007 no longer expresses zero-fixed-cost pre-revenue invariant")

    adr9 = (ROOT / "decisions/ADR-0009-MK1-ZERO-COST-REDUCED-SURFACE.md").read_text(encoding="utf-8")
    for token in ["client explicitly agrees", "access-controlled", "not a public URL", "tenant isolation"]:
        if token not in adr9:
            errors.append(f"ADR-0009 missing reduced-surface safeguard: {token}")

    if errors:
        print("MK1 PRE-PILOT READINESS: FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("MK1 PRE-PILOT READINESS: PASS")
    print("approved_baselines=12 runtime=FACTORY_CERTIFIED paid_pre_pilot_infra_required=false")
    print("claim=repository-side readiness only; real client/provider/P1 evidence still required")
    return 0


if __name__ == "__main__":
    sys.exit(main())
