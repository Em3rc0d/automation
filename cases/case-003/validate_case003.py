#!/usr/bin/env python3
"""Static contract gates for CASE-003.

Dependency-free repository validation. G1 validates the structural contract
supported by supplied XLSX evidence; it does not certify SAP export completeness
or business meanings absent from the source files.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CASE = ROOT / "cases" / "CASE-003-S4HANA-SUPPLIER-SELF-SERVICE.md"
INV = ROOT / "cases" / "case-003" / "invariants.json"
SCHEMA = ROOT / "cases" / "case-003" / "invariants.schema.json"
CONTRACTS = ROOT / "architecture" / "CASE-003-ADAPTER-CONTRACTS.md"
PROFILE = ROOT / "cases" / "case-003" / "import-profile.v1.json"
REPORT = ROOT / "cases" / "case-003" / "S4HANA-REPORT-CONTRACT-v1.md"

EXPECTED_IDS = {f"C3-I{i:02d}" for i in range(1, 19)}
REQUIRED_CONTRACTS = {
    "ChannelAdapter",
    "VerificationDeliveryAdapter",
    "FileImportAdapter",
    "ObjectStorage",
    "NormalizedDataset",
    "SupplierCanonical",
    "InvoiceCanonical",
    "FinancialItemCanonical",
}
REQUIRED_GATES = {f"G{i}" for i in range(7)}


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


def main() -> int:
    for path in (CASE, INV, SCHEMA, CONTRACTS, PROFILE, REPORT):
        if not path.is_file():
            fail(f"missing required file: {path.relative_to(ROOT)}")

    case_text = CASE.read_text(encoding="utf-8")
    contracts_text = CONTRACTS.read_text(encoding="utf-8")
    payload = json.loads(INV.read_text(encoding="utf-8"))
    json.loads(SCHEMA.read_text(encoding="utf-8"))
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))

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

    required_phrases = [
        "RUC alone NEVER authenticates or authorizes",
        "one ACTIVE snapshot",
        "resource ownership",
        "real-time SAP",
        "SHA-256",
    ]
    for phrase in required_phrases:
        if phrase.lower() not in case_text.lower():
            fail(f"missing critical design assertion: {phrase}")

    if profile.get("profileKey") != "sap-s4hana-soltrak-ap-v1":
        fail("unexpected G1 import profile key")
    if set(profile.get("sources", {})) != {"qqva", "sciv", "fbl1n"}:
        fail("G1 import profile must contain qqva, sciv and fbl1n sources")

    joins = {j.get("name") for j in profile.get("joins", [])}
    required_joins = {
        "supplier_sciv",
        "sciv_fbl1n_primary",
        "sciv_fbl1n_reference_reconciliation",
    }
    if not required_joins <= joins:
        fail(f"missing G1 joins: {sorted(required_joins - joins)}")

    print("PASS: CASE-003 G0 static contract gate")
    print("PASS: 18 invariants registered and documented")
    print("PASS: adapter boundaries present")
    print("PASS: CASE-003 G1 structural report contract is evidence-frozen")
    print("OPEN PILOT GAPS: SAP status dictionary, QQVA version policy, RUC/contact authority, freshness policy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
