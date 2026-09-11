#!/usr/bin/env python3
"""Promote a TESTED package non-destructively.

Source evidence is never moved/deleted. Promotion copies the package into both
50-approved-baseline and workflows/n8n after validating TEST-REPORT PASS.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TESTED_ROOT = ROOT / "quarries/workflow-quarry/40-tested"
APPROVED_ROOT = ROOT / "quarries/workflow-quarry/50-approved-baseline"
LIBRARY_ROOT = ROOT / "workflows/n8n"

REQUIRED = ["workflow.json", "manifest.yaml", "config.schema.json", "README.md", "evidence/TEST-REPORT.md"]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--package", required=True)
    ap.add_argument("--family", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    package = (ROOT / args.package).resolve() if not Path(args.package).is_absolute() else Path(args.package).resolve()
    try:
        package.relative_to(TESTED_ROOT.resolve())
    except ValueError:
        print("PROMOTION REFUSED: package must be under 40-tested", file=sys.stderr)
        return 2

    missing = [rel for rel in REQUIRED if not (package / rel).is_file()]
    if missing:
        print(f"PROMOTION REFUSED: missing {missing}", file=sys.stderr)
        return 2

    report = (package / "evidence/TEST-REPORT.md").read_text(encoding="utf-8")
    if "VERDICT: PASS" not in report:
        print("PROMOTION REFUSED: TEST-REPORT lacks exact 'VERDICT: PASS'", file=sys.stderr)
        return 2

    workflow = json.loads((package / "workflow.json").read_text(encoding="utf-8"))
    key = workflow.get("meta", {}).get("candidateKey")
    version = workflow.get("meta", {}).get("candidateVersion")
    if not key or not version:
        print("PROMOTION REFUSED: workflow meta lacks candidateKey/candidateVersion", file=sys.stderr)
        return 2

    package_name = f"{key}@{version}"
    approved = APPROVED_ROOT / args.family / package_name
    library = LIBRARY_ROOT / args.family / package_name

    summary = {
        "source": str(package.relative_to(ROOT)),
        "workflow_sha256": sha256(package / "workflow.json"),
        "approved_target": str(approved.relative_to(ROOT)),
        "library_target": str(library.relative_to(ROOT)),
        "dry_run": args.dry_run,
    }
    print(json.dumps(summary, indent=2))

    if args.dry_run:
        print("PROMOTION DRY RUN: PASS")
        return 0

    if approved.exists() or library.exists():
        print("PROMOTION REFUSED: destination already exists; version explicitly instead of overwrite", file=sys.stderr)
        return 2

    approved.parent.mkdir(parents=True, exist_ok=True)
    library.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(package, approved)
    shutil.copytree(package, library)

    promotion = (
        "# Promotion Evidence\n\n"
        f"Source: `{package.relative_to(ROOT)}`\n\n"
        f"Workflow SHA-256: `{summary['workflow_sha256']}`\n\n"
        "Source package was preserved; promotion used copy semantics.\n"
    )
    (approved / "PROMOTION.md").write_text(promotion, encoding="utf-8")
    (library / "PROMOTION.md").write_text(promotion, encoding="utf-8")

    print("PROMOTION: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
