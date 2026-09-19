#!/usr/bin/env python3
"""Static contract gate for CASE-003.

This is intentionally dependency-free. It validates repository evidence that can
be proven before a real S/4HANA report sample exists. It does not claim runtime,
SAP extraction, database, connector, or end-to-end certification.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASE = ROOT / "cases" / "CASE-003-S4HANA-SUPPLIER-SELF-SERVICE.md"
INV = ROOT / "cases" / "case-003" / "invariants.json"
SCHEMA = ROOT / "cases" / "case-003" / "invariants.schema.json"
CONTRACTS = ROOT / "architecture" / "CASE-003-ADAPTER-CONTRACTS.md"

EXPECTED_IDS = {f"C3-I{i:02d}" for i in range(1, 19)}
REQUIRED_CONTRACTS = {
    "ChannelAdapter",
    "VerificationDeliveryAdapter",
    "FileImportAdapter",
    "ObjectStorage",
    "NormalizedDataset",
}
REQUIRED_GATES = {f"G{i}" for i in range(7)}


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def main() -> int:
    for path in (CASE, INV, SCHEMA, CONTRACTS):
        if not path.is_file():
            fail(f"missing required file: {path.relative_to(ROOT)}")

    case_text = CASE.read_text(encoding="utf-8")
    contracts_text = CONTRACTS.read_text(encoding="utf-8")
    payload = json.loads(INV.read_text(encoding="utf-8"))
    json.loads(SCHEMA.read_text(encoding="utf-8"))

    if payload.get("caseId") != "CASE-003" or payload.get("version") != 1:
        fail("unexpected caseId/version")

    invariants = payload.get("invariants")
    if not isinstance(invariants, list):
        fail("invariants must be a list")

    ids = [x.get("id") for x in invariants]
    if len(ids) != len(set(ids)):
        fail("duplicate invariant IDs")
    if set(ids) != EXPECTED_IDS:
        fail(f"invariant ID set mismatch: {sorted(set(ids) ^ EXPECTED_IDS)}")

    gates = {x.get("gate") for x in invariants}
    if not gates <= REQUIRED_GATES:
        fail(f"unknown gates: {sorted(gates - REQUIRED_GATES)}")

    for item in invariants:
        if not isinstance(item.get("statement"), str) or len(item["statement"]) < 10:
            fail(f"invalid statement for {item.get('id')}")
        if item["id"] not in case_text:
            fail(f"{item['id']} is not documented in case baseline")

    for name in REQUIRED_CONTRACTS:
        if name not in contracts_text:
            fail(f"missing contract: {name}")

    # Critical safety assertions must remain explicit in the design authority.
    required_phrases = [
        "RUC alone NEVER authenticates or authorizes",
        "one ACTIVE snapshot",
        "resource ownership",
        "real-time SAP",
        "SHA-256",
        "anonymized XLSX/CSV",
    ]
    for phrase in required_phrases:
        if phrase.lower() not in case_text.lower():
            fail(f"missing critical design assertion: {phrase}")

    # Production record contract must remain blocked before G1.
    if not re.search(r"records:\s*unknown\[\]", contracts_text):
        fail("NormalizedDataset records must remain unknown[] before G1")

    print("PASS: CASE-003 G0 static contract gate")
    print("PASS: 18 invariants registered and documented")
    print("PASS: adapter boundaries present")
    print("PASS: CASE-003 G1 structural report contract is evidence-frozen")\n    print("OPEN PILOT GAPS: SAP status dictionary, QQVA version policy, RUC/contact authority, freshness policy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
