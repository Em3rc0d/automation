#!/usr/bin/env python3
"""Record a human/legal/engineering gate decision without moving source material.

The factory automates evidence capture, not legal or business judgment. Gate
records are immutable JSON documents stored alongside the relevant quarry stage.
`AUTOMATION_FACTORY_ROOT` exists only for isolated CI self-tests.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_ROOT = Path(__file__).resolve().parents[2]
ROOT = Path(os.environ.get("AUTOMATION_FACTORY_ROOT", str(DEFAULT_ROOT))).resolve()

STAGES = {
    "DISCOVERED": ("00-discovered", {"REGISTERED"}),
    "LICENSE_CHECKED": ("10-license-checked", {"ALLOW_ADAPT", "REFERENCE_ONLY", "BLOCK"}),
    "INSPECTED": ("20-inspected", {"PASS", "REMEDIATE", "BLOCK"}),
    "HARDENED": ("30-hardened", {"PASS", "REMEDIATE"}),
    "TESTED": ("40-tested", {"PASS", "FAIL"}),
    "APPROVED_BASELINE": ("50-approved-baseline", {"APPROVE", "REJECT"}),
}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def resolve_local_source(value: str) -> Path | None:
    p = Path(value)
    if not p.is_absolute():
        p = ROOT / p
    try:
        p = p.resolve()
    except OSError:
        return None
    return p if p.exists() else None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--candidate-id", required=True)
    ap.add_argument("--stage", required=True, choices=STAGES)
    ap.add_argument("--decision", required=True)
    ap.add_argument("--actor", required=True)
    ap.add_argument("--source-ref", required=True, help="Repository path or external URL/reference")
    ap.add_argument("--source-sha256", help="Required when source-ref is not a local file")
    ap.add_argument("--evidence-ref", action="append", default=[])
    ap.add_argument("--notes", default="")
    ap.add_argument("--record-id", help="Stable id for CI/self-test; default is UTC timestamp")
    args = ap.parse_args()

    stage_dir, allowed = STAGES[args.stage]
    if args.decision not in allowed:
        print(f"GATE RECORD REFUSED: decision {args.decision!r} invalid for {args.stage}; allowed={sorted(allowed)}", file=sys.stderr)
        return 2

    local = resolve_local_source(args.source_ref)
    source_sha = args.source_sha256
    source_kind = "external-reference"
    source_ref = args.source_ref
    if local is not None:
        source_kind = "local-directory" if local.is_dir() else "local-file"
        if local.is_file():
            source_sha = sha256_file(local)
        elif local.is_dir():
            workflow = local / "workflow.json"
            source_sha = sha256_file(workflow) if workflow.is_file() else None
        try:
            source_ref = str(local.relative_to(ROOT))
        except ValueError:
            source_ref = str(local)

    if not source_sha:
        print("GATE RECORD REFUSED: source SHA-256 is required or must be computable from a local workflow/file", file=sys.stderr)
        return 2

    if len(source_sha) != 64 or any(c not in "0123456789abcdefABCDEF" for c in source_sha):
        print("GATE RECORD REFUSED: source SHA-256 must be 64 hexadecimal characters", file=sys.stderr)
        return 2

    record_id = args.record_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    target_dir = ROOT / "quarries/workflow-quarry" / stage_dir / "_gate-records" / args.candidate_id
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{record_id}.json"
    if target.exists():
        print("GATE RECORD REFUSED: immutable record already exists", file=sys.stderr)
        return 2

    record = {
        "schemaVersion": "1.0",
        "candidateId": args.candidate_id,
        "stage": args.stage,
        "decision": args.decision,
        "actor": args.actor,
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "source": {
            "kind": source_kind,
            "ref": source_ref,
            "sha256": source_sha.lower(),
            "preserved": True,
        },
        "evidenceRefs": args.evidence_ref,
        "notes": args.notes,
        "automatedDecision": False,
    }
    target.write_text(json.dumps(record, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(target.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
