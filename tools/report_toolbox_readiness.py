#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "certification/TOOLBOX-READINESS-POLICY.json"
COVERAGE = ROOT / "certification/CAPABILITY-COVERAGE-MAP.md"
LIBRARY = ROOT / "workflows/SMB-CAPABILITY-LIBRARY.md"
APPROVED = ROOT / "workflows/n8n"

STATUS_RANK = {
    "GAP": 0,
    "DESIGNED_MINED": 1,
    "PARTIAL": 2,
    "IN_CERTIFICATION": 3,
    "CERTIFIED": 4,
}


def designed_capabilities() -> set[str]:
    text = LIBRARY.read_text(encoding="utf-8")
    return set(re.findall(r"`([A-Z0-9_]+)@1`", text))


def approved_capabilities() -> set[str]:
    out: set[str] = set()
    if not APPROVED.exists():
        return out
    for path in APPROVED.rglob("*"):
        if not path.is_dir():
            continue
        name = path.name
        if "@" in name:
            out.add(name.split("@", 1)[0])
    return out


def family_statuses() -> dict[int, str]:
    text = COVERAGE.read_text(encoding="utf-8")
    rows: dict[int, str] = {}
    rx = re.compile(r"^\|\s*(\d+)\s*\|.*?\|\s*(CERTIFIED|IN_CERTIFICATION|DESIGNED_MINED|PARTIAL|GAP)\s*\|", re.MULTILINE)
    for number, status in rx.findall(text):
        rows[int(number)] = status
    return rows


def main() -> int:
    policy = json.loads(POLICY.read_text(encoding="utf-8"))
    designed = designed_capabilities()
    approved = approved_capabilities()
    statuses = family_statuses()

    archetypes = []
    designed_ready = 0
    approved_ready = 0
    for spec in policy["referenceArchetypes"]:
        req = set(spec["requires"])
        missing_design = sorted(req - designed)
        missing_approved = sorted(req - approved)
        design_ok = not missing_design
        approved_ok = not missing_approved
        designed_ready += int(design_ok)
        approved_ready += int(approved_ok)
        archetypes.append({
            "id": spec["id"],
            "designedReady": design_ok,
            "approvedReady": approved_ok,
            "missingDesigned": missing_design,
            "missingApproved": missing_approved,
        })

    expected_families = int(policy["canonicalFamilyCount"])
    min_status = policy["minimumFamilyStatus"]
    min_rank = STATUS_RANK[min_status]
    all_families_present = set(statuses) == set(range(1, expected_families + 1))
    all_families_minimum = all_families_present and all(STATUS_RANK.get(statuses[i], -1) >= min_rank for i in range(1, expected_families + 1))

    computed_ready = (
        all_families_minimum
        and approved_ready >= int(policy["minimumApprovedReferenceArchetypes"])
        and policy["providerVariantsCountAsCapabilities"] is False
        and policy["miningMustRemainContinuous"] is True
    )

    result = {
        "claimBroadToolboxReady": bool(policy["claimBroadToolboxReady"]),
        "computedBroadToolboxReady": computed_ready,
        "canonicalFamiliesPresent": len(statuses),
        "canonicalFamiliesRequired": expected_families,
        "minimumFamilyStatus": min_status,
        "familiesMeetingMinimum": sum(1 for s in statuses.values() if STATUS_RANK.get(s, -1) >= min_rank),
        "designedCapabilityCount": len(designed),
        "approvedCapabilityCount": len(approved),
        "referenceArchetypesDesignedReady": designed_ready,
        "referenceArchetypesApprovedReady": approved_ready,
        "referenceArchetypesRequiredForBroadReady": int(policy["minimumApprovedReferenceArchetypes"]),
        "archetypes": archetypes,
    }

    print(json.dumps(result, indent=2, sort_keys=True))

    if policy["claimBroadToolboxReady"] and not computed_ready:
        print("TOOLBOX READINESS: FAIL — repository claims BROAD_TOOLBOX_READY without meeting policy", file=sys.stderr)
        return 1

    print("TOOLBOX READINESS: PASS — claim is consistent with computed evidence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
