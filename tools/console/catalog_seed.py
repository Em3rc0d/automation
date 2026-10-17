#!/usr/bin/env python3
"""Idempotent, zero-dependency SQLite seed for the MK1 automation catalog.

Canonical source: workflows/SAVINGS-WORKFLOW-REGISTRY.json.
Seeds *templates/catalog entries*, never installations, credentials or live state.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "workflows" / "SAVINGS-WORKFLOW-REGISTRY.json"
DEFAULT_DB = ROOT / ".local" / "console" / "catalog.sqlite3"

DDL = """
CREATE TABLE IF NOT EXISTS automation_catalog (
  workflow_key TEXT NOT NULL,
  version TEXT NOT NULL,
  source_id TEXT NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  stage TEXT NOT NULL,
  runtime_profile TEXT NOT NULL,
  manual_work_reduced TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  source_present INTEGER NOT NULL DEFAULT 1 CHECK (source_present IN (0, 1)),
  PRIMARY KEY(workflow_key, version)
);
CREATE INDEX IF NOT EXISTS automation_catalog_stage_idx
 ON automation_catalog(source_present, stage, domain);
CREATE TABLE IF NOT EXISTS catalog_seed_metadata (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  source_sha256 TEXT NOT NULL,
  source_count INTEGER NOT NULL,
  active_count INTEGER NOT NULL
);
"""


def _load_source(path: Path) -> tuple[list[dict], str]:
    raw = path.read_bytes()
    registry = json.loads(raw)
    if not isinstance(registry, dict) or registry.get("schema_version") != 1:
        raise ValueError("Expected Savings Workflow Registry schema_version=1")
    entries = registry.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("Workflow registry has no entries; refusing to seed")
    if registry.get("count") != len(entries):
        raise ValueError("Registry count does not match number of entries")
    used_keys: set[str] = set()
    used_ids: set[str] = set()
    for idx, item in enumerate(entries):
        if not isinstance(item, dict):
            raise ValueError(f"Registry entry {idx} is not an object")
        for key in ("id", "key", "version", "name", "domain", "stage", "runtime_profile"):
            if not isinstance(item.get(key), str) or not item[key].strip():
                raise ValueError(f"Registry entry {idx} missing {key}")
        if item["key"] in used_keys or item["id"] in used_ids:
            raise ValueError(f"Duplicate workflow key or id: {item['key']}")
        used_keys.add(item["key"])
        used_ids.add(item["id"])
        if item["stage"] == "APPROVED_BASELINE":
            ref = item.get("approval", {}).get("baseline_record")
            if not isinstance(ref, str) or not ref.startswith("workflows/approved/savings/"):
                raise ValueError(f"Approved workflow lacks approval record: {item['key']}")
    return entries, hashlib.sha256(raw).hexdigest()


@contextmanager
def _connect(db_path: Path):
    """Commit/rollback AND explicitly close handles (critical on Windows)."""
    if db_path.exists() and db_path.is_symlink():
        raise ValueError("Refusing to seed through a symlinked catalog DB")
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(db_path, timeout=10)
    try:
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA busy_timeout=10000")
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def seed_catalog(source_path: Path = SOURCE, db_path: Path = DEFAULT_DB) -> dict:
    """Atomic upsert; unchanged rows stay untouched, withdrawn rows remain as history."""
    entries, source_sha = _load_source(Path(source_path))
    db_path = Path(db_path).resolve()
    if db_path == Path(source_path).resolve():
        raise ValueError("Catalog DB cannot overwrite source registry")
    with _connect(db_path) as db:
        # executescript() commits a pending transaction; create schema first.
        db.executescript(DDL)
        db.execute("BEGIN IMMEDIATE")
        old = {
            (r["workflow_key"], r["version"]): (r["payload_sha256"], r["source_present"])
            for r in db.execute("SELECT workflow_key, version, payload_sha256, source_present FROM automation_catalog")
        }
        counts = {"inserted": 0, "updated": 0, "unchanged": 0}
        keys: list[tuple[str, str]] = []
        for item in entries:
            key = item["key"], item["version"]
            keys.append(key)
            payload = json.dumps(item, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
            payload_sha = hashlib.sha256(payload.encode("utf-8")).hexdigest()
            previous = old.get(key)
            if previous is None:
                counts["inserted"] += 1
            elif previous == (payload_sha, 1):
                counts["unchanged"] += 1
            else:
                counts["updated"] += 1
            db.execute(
                """
                INSERT INTO automation_catalog(
                    workflow_key, version, source_id, name, domain, stage,
                    runtime_profile, manual_work_reduced, payload_json, payload_sha256, source_present
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                ON CONFLICT(workflow_key, version) DO UPDATE SET
                    source_id=excluded.source_id,
                    name=excluded.name,
                    domain=excluded.domain,
                    stage=excluded.stage,
                    runtime_profile=excluded.runtime_profile,
                    manual_work_reduced=excluded.manual_work_reduced,
                    payload_json=excluded.payload_json,
                    payload_sha256=excluded.payload_sha256,
                    source_present=1
                WHERE automation_catalog.payload_sha256 != excluded.payload_sha256
                   OR automation_catalog.source_present = 0
                """,
                (item["key"], item["version"], item["id"], item["name"], item["domain"],
                 item["stage"], item["runtime_profile"], item.get("manual_work_reduced", ""),
                 payload, payload_sha),
            )

        # Retain old rows for audit, but never display or install workflows removed
        # from the authoritative registry.
        db.execute("""
            CREATE TEMP TABLE IF NOT EXISTS current_seed_keys(
              workflow_key TEXT NOT NULL, version TEXT NOT NULL,
              PRIMARY KEY(workflow_key, version)
            )
        """)
        db.execute("DELETE FROM current_seed_keys")
        db.executemany(
            "INSERT INTO current_seed_keys(workflow_key, version) VALUES (?, ?)", keys
        )
        db.execute("""
            UPDATE automation_catalog SET source_present=0
             WHERE source_present=1 AND NOT EXISTS (
               SELECT 1 FROM current_seed_keys c
                WHERE c.workflow_key=automation_catalog.workflow_key
                  AND c.version=automation_catalog.version
             )
        """)
        withdrawn = db.execute("SELECT changes()").fetchone()[0]
        active_count = db.execute(
            "SELECT count(*) FROM automation_catalog WHERE source_present=1"
        ).fetchone()[0]
        if active_count != len(entries):
            raise ValueError("Seeded catalog count mismatch; rolling back")
        stage_counts = {
            row["stage"]: row["total"]
            for row in db.execute("""
                SELECT stage, COUNT(*) AS total FROM automation_catalog
                 WHERE source_present=1 GROUP BY stage
            """)
        }
        db.execute("""
            INSERT INTO catalog_seed_metadata(id, source_sha256, source_count, active_count)
            VALUES (1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              source_sha256=excluded.source_sha256,
              source_count=excluded.source_count,
              active_count=excluded.active_count
        """, (source_sha, len(entries), active_count))
        # Commit on leaving the transaction; no changes to tenant bundles.
    return {
        "schemaVersion": 1,
        "source": "workflows/SAVINGS-WORKFLOW-REGISTRY.json",
        "sourceSha256": source_sha,
        "catalogTotal": active_count,
        "approvedTotal": stage_counts.get("APPROVED_BASELINE", 0),
        "designReadyTotal": stage_counts.get("DESIGN_READY", 0),
        "stages": stage_counts,
        "withdrawn": withdrawn,
        **counts,
        "productionClaim": False,
    }


def list_catalog(db_path: Path) -> list[dict]:
    with _connect(Path(db_path).resolve()) as db:
        rows = db.execute("""
            SELECT workflow_key, version, name, domain, stage, runtime_profile,
                   manual_work_reduced
              FROM automation_catalog
             WHERE source_present=1
             ORDER BY (stage != 'APPROVED_BASELINE'), domain, name, workflow_key
        """).fetchall()
        return [
            {
                "key": r["workflow_key"], "version": r["version"],
                "name": r["name"], "domain": r["domain"], "stage": r["stage"],
                "runtimeProfile": r["runtime_profile"],
                "manualWorkReduced": r["manual_work_reduced"],
                "installable": r["stage"] == "APPROVED_BASELINE",
            }
            for r in rows
        ]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=SOURCE)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    print(json.dumps(seed_catalog(args.registry, args.db), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
