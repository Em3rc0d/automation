#!/usr/bin/env python3
"""Preserve a failed candidate/evidence record under no-pass-verified.

This tool never deletes or moves the source candidate.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NO_PASS = ROOT / "quarries/workflow-quarry/no-pass-verified"
ALLOWED = {"license-blocked", "provenance-blocked", "security-blocked", "quality-blocked", "test-failed", "not-current-priority", "superseded", "knowledge-only"}


def file_hash(path: Path) -> str | None:
    if not path.is_file():
        return None
    h = hashlib.sha256(path.read_bytes()).hexdigest()
    return h


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--category", required=True, choices=sorted(ALLOWED))
    ap.add_argument("--reason", required=True)
    ap.add_argument("--evidence")
    ap.add_argument("--out-name")
    args = ap.parse_args()

    source = (ROOT / args.source).resolve() if not Path(args.source).is_absolute() else Path(args.source).resolve()
    if not source.exists():
        print("FAILURE RECORD REFUSED: source does not exist", file=sys.stderr)
        return 2

    default_name = source.name.replace("@", "-")
    name = args.out_name or f"{default_name}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
    target = NO_PASS / args.category / name
    if target.exists():
        print("FAILURE RECORD REFUSED: target already exists", file=sys.stderr)
        return 2
    target.mkdir(parents=True)

    if args.evidence:
        evidence = (ROOT / args.evidence).resolve() if not Path(args.evidence).is_absolute() else Path(args.evidence).resolve()
        if evidence.is_file():
            shutil.copy2(evidence, target / evidence.name)
        elif evidence.is_dir():
            shutil.copytree(evidence, target / "evidence")

    workflow = source / "workflow.json" if source.is_dir() else source
    record = {
        "recordedAt": datetime.now(timezone.utc).isoformat(),
        "category": args.category,
        "reason": args.reason,
        "source": str(source.relative_to(ROOT)) if source.is_relative_to(ROOT) else str(source),
        "sourceWorkflowSha256": file_hash(workflow),
        "sourcePreserved": True,
        "reentry": "Allowed after the failed gate is remediated and re-evaluated; never delete this evidence record.",
    }
    (target / "FAILURE.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    (target / "README.md").write_text(
        "# No-pass verified evidence\n\n"
        f"Category: `{args.category}`\n\n"
        f"Reason: {args.reason}\n\n"
        f"Source: `{record['source']}`\n\n"
        "The source candidate remains preserved. This record is historical evidence and must not be silently deleted.\n",
        encoding="utf-8",
    )
    print(target.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
