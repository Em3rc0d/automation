#!/usr/bin/env python3
"""Seed the *entire catalog* into a client's local planning workspace.

Only APPROVED_BASELINE references may create DRAFT installation bundles.
Never changes user configuration, credentials, acceptance evidence or runtime state.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONSOLE = Path(__file__).resolve().parent


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


catalog_seed = load_module(CONSOLE / "catalog_seed.py", "tenant_catalog_seed")
installer = load_module(ROOT / "tools/savings/install_approved.py", "tenant_savings_installer")
TENANT_PATTERN = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?\Z")

DDL = """
CREATE TABLE IF NOT EXISTS tenant_workflow_plans (
  tenant_id TEXT NOT NULL,
  workflow_key TEXT NOT NULL,
  version TEXT NOT NULL,
  stage_snapshot TEXT NOT NULL,
  source_present INTEGER NOT NULL DEFAULT 1 CHECK (source_present IN (0, 1)),
  PRIMARY KEY(tenant_id, workflow_key, version)
);
CREATE INDEX IF NOT EXISTS tenant_workflow_plans_lookup_idx
 ON tenant_workflow_plans(tenant_id, source_present, stage_snapshot);
"""

@contextmanager
def _connect(db_path: Path):
    """Never leave SQLite files locked after closing a Windows test/server request."""
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


def validate_tenant(tenant: str) -> str:
    if not isinstance(tenant, str) or not TENANT_PATTERN.fullmatch(tenant):
        raise ValueError("Invalid tenant ID; expected lowercase slug")
    return tenant


def seed_tenant(tenant: str, db_path: Path, installations_root: Path,
                *, auto_scaffold: bool = True) -> dict:
    """Idempotently assign ALL catalog references and scaffold approved DRAFTs.

    Existing bundles are left completely untouched, even when not DRAFT.
    If an existing approved-bundle path is corrupt, abort rather than replace.
    """
    tenant = validate_tenant(tenant)
    db_path = Path(db_path).resolve()
    installations_root = Path(installations_root).resolve()
    if not db_path.is_file() or db_path.is_symlink():
        raise ValueError("Catalog seed must succeed before seeding a tenant")
    if (installations_root / tenant).is_symlink():
        raise ValueError("Tenant installation directory is a symlink")
    with _connect(db_path) as db:
        db.executescript(DDL)
        db.execute("BEGIN IMMEDIATE")
        rows = db.execute("""
            SELECT workflow_key, version, stage FROM automation_catalog
             WHERE source_present=1
             ORDER BY workflow_key, version
        """).fetchall()
        if not rows:
            raise ValueError("Catalog is empty")
        for row in rows:
            db.execute("""
                INSERT INTO tenant_workflow_plans
                (tenant_id, workflow_key, version, stage_snapshot, source_present)
                VALUES (?, ?, ?, ?, 1)
                ON CONFLICT(tenant_id, workflow_key, version) DO UPDATE SET
                   stage_snapshot=excluded.stage_snapshot,
                   source_present=1
                WHERE tenant_workflow_plans.stage_snapshot<>excluded.stage_snapshot
                   OR tenant_workflow_plans.source_present=0
            """, (tenant, row["workflow_key"], row["version"], row["stage"]))
        # Previous catalog entries remain for provenance but are no longer active.
        db.execute("""
            UPDATE tenant_workflow_plans SET source_present=0
             WHERE tenant_id=? AND source_present=1 AND NOT EXISTS (
               SELECT 1 FROM automation_catalog c
                WHERE c.workflow_key=tenant_workflow_plans.workflow_key
                  AND c.version=tenant_workflow_plans.version
                  AND c.source_present=1
             )
        """, (tenant,))
        count = db.execute("""
            SELECT COUNT(*) FROM tenant_workflow_plans
             WHERE tenant_id=? AND source_present=1
        """, (tenant,)).fetchone()[0]
        if count != len(rows):
            raise RuntimeError("Tenant catalog total mismatch")

    approved = [r for r in rows if r["stage"] == "APPROVED_BASELINE"]
    installed, existing = 0, 0
    if auto_scaffold:
        for row in approved:
            workflow_key = row["workflow_key"]
            item = installer.registry_by_key().get(workflow_key)
            if item is None or item["stage"] != "APPROVED_BASELINE":
                raise ValueError(f"Registry disagrees with approval stage for {workflow_key}")
            path = installations_root / tenant / f"{workflow_key}@{row['version']}"
            if path.is_symlink():
                raise ValueError(f"Refusing symlinked installation: {workflow_key}")
            if path.exists():
                if not path.is_dir() or not (path / "installation.json").is_file():
                    raise ValueError(f"Existing installation appears corrupt: {workflow_key}")
                identity = installer.read_json(path / "installation.json")
                if (identity.get("tenantId"), identity.get("workflowKey"),
                    identity.get("workflowVersion")) != (tenant, workflow_key, row["version"]):
                    raise ValueError(f"Existing installation identity mismatch: {workflow_key}")
                existing += 1
                continue
            installer.scaffold(workflow_key, tenant, installations_root)
            installed += 1
    return {
        "schemaVersion": 1, "tenantId": tenant, "catalogAssigned": count,
        "approvedBaselines": len(approved),
        "designOnly": len(rows) - len(approved),
        "newDraftBundles": installed, "existingBundlesPreserved": existing,
        "providerExecution": False, "productionClaim": False,
    }


def tenant_plan(tenant: str, db_path: Path, installations_root: Path) -> dict:
    """Read all assigned catalog items; status derives from real bundle files."""
    tenant = validate_tenant(tenant)
    if not Path(db_path).is_file():
        return {"tenantId": tenant, "entries": [], "assignedTotal": 0,
                "installedTotal": 0, "designOnlyTotal": 0, "productionClaim": False}
    with _connect(db_path) as db:
        rows = db.execute("""
            SELECT c.workflow_key, c.version, c.name, c.domain, c.stage,
                   c.manual_work_reduced, c.runtime_profile
              FROM tenant_workflow_plans p
              JOIN automation_catalog c ON c.workflow_key=p.workflow_key AND c.version=p.version
             WHERE p.tenant_id=? AND p.source_present=1 AND c.source_present=1
             ORDER BY (c.stage != 'APPROVED_BASELINE'), c.domain, c.name
        """, (tenant,)).fetchall()
    assigned = []
    for row in rows:
        approved = row["stage"] == "APPROVED_BASELINE"
        bundle = Path(installations_root).resolve() / tenant / (
            f"{row['workflow_key']}@{row['version']}")
        state = "DESIGN_ONLY"
        if approved:
            state = "AVAILABLE_FOR_SETUP"
            if bundle.is_dir() and not bundle.is_symlink():
                try:
                    identity = installer.read_json(bundle / "installation.json")
                    if (identity.get("tenantId"), identity.get("workflowKey"),
                        identity.get("workflowVersion")) == (
                            tenant, row["workflow_key"], row["version"]):
                        # Labels derive from saved installation; no spoofed certification.
                        state = identity.get("state", "DRAFT")
                except (FileNotFoundError, ValueError, json.JSONDecodeError):
                    state = "INVALID_BUNDLE"
        local_simulation = "NOT_TESTED"
        evidence = Path(db_path).resolve().parent / "simulations" / tenant / (
            row["workflow_key"] + ".json")
        if approved and evidence.is_file() and not evidence.is_symlink():
            try:
                result = json.loads(evidence.read_text(encoding="utf-8"))
                if (result.get("tenantId") == tenant
                        and result.get("workflowKey") == row["workflow_key"]
                        and result.get("evidenceType") == "LOCAL_SIMULATION"
                        and result.get("productionEvidence") is False):
                    local_simulation = result.get("status", "NOT_TESTED")
            except (ValueError, OSError):
                pass
        assigned.append({
            "localSimulationStatus": local_simulation,
            "key": row["workflow_key"], "version": row["version"],
            "name": row["name"], "domain": row["domain"],
            "stage": row["stage"], "state": state,
            "runtimeProfile": row["runtime_profile"],
            "manualWorkReduced": row["manual_work_reduced"],
            "installable": approved,
        })
    return {
        "schemaVersion": 1, "tenantId": tenant, "entries": assigned,
        "assignedTotal": len(assigned),
        "installedTotal": sum(x["state"] in ("DRAFT", "CLIENT_CONFIGURED", "CLIENT_ACCEPTED") for x in assigned),
        "designOnlyTotal": sum(x["state"] == "DESIGN_ONLY" for x in assigned),
        "productionClaim": False
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tenant", default="chifaavperu")
    parser.add_argument("--db", type=Path, default=catalog_seed.DEFAULT_DB)
    parser.add_argument("--installations-root", type=Path, default=ROOT / ".local/installations")
    args = parser.parse_args()
    catalog_seed.seed_catalog(catalog_seed.SOURCE, args.db)
    print(json.dumps(seed_tenant(args.tenant, args.db, args.installations_root),
                     indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
