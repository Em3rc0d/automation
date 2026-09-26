#!/usr/bin/env python3
"""Generate a zero-secret MK1 pilot intake workspace from a pilot preflight spec."""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BOOTSTRAP = ROOT / "tools/savings/pilot_bootstrap.py"
CONNECTOR_REQUIREMENTS = ROOT / "operations/savings/connector-requirements.json"
REGISTRY = ROOT / "workflows/SAVINGS-WORKFLOW-REGISTRY.json"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def evidence_spec(tenant: str, workflows: list[dict]) -> dict:
    return {
        "schemaVersion": 1,
        "tenantId": tenant,
        "pilot": {
            "fundingStatus": "UNFUNDED",
            "clientNameRef": "TO_BE_FILLED",
            "operatorOwner": "TO_BE_FILLED",
        },
        "surface": {
            "mode": "REDUCED_STATIC",
            "clientAgreementEvidence": None,
            "deliveryChannel": None,
        },
        "workflows": [
            {
                "key": item["workflowKey"],
                "bundlePath": item["bundlePath"],
            }
            for item in workflows
        ],
        "gates": {
            name: {"passed": False, "evidence": None, "notes": None}
            for name in [
                "roleModelAgreed",
                "providerAccountBound",
                "connectorScopesVerified",
                "savingsBaselineAgreed",
                "controlledLiveExecutionPassed",
                "clientAcceptanceRecorded",
                "tenantIsolationProved",
                "backupRestorePassed",
                "incidentDrillPassed",
                "deploymentRollbackApproved",
            ]
        },
    }


def generate(spec_path: Path, out_root: Path) -> dict:
    bootstrap = load_module(BOOTSTRAP, "pilot_bootstrap")
    spec = read_json(spec_path)
    plan = bootstrap.build_plan(spec)
    tenant = plan["tenantId"]
    out = out_root / tenant
    out.mkdir(parents=True, exist_ok=True)

    registry = {item["key"]: item for item in read_json(REGISTRY)["entries"]}
    connector_requirements = read_json(CONNECTOR_REQUIREMENTS)["workflows"]
    requested_by_key = {item["key"]: item for item in spec["workflows"]}

    workflow_rows = []
    for planned in plan["workflows"]:
        key = planned["workflowKey"]
        requested = requested_by_key[key]
        bundle = f".local/installations/{tenant}/{key}@{planned['version']}"
        workflow_rows.append({
            "workflowKey": key,
            "bundlePath": bundle,
            "version": planned["version"],
        })

        baseline = {
            "schemaVersion": 1,
            "workflowKey": key,
            "unit": planned["savingsUnit"],
            "status": "DRAFT",
            "manual_minutes_per_unit": requested.get("manualMinutesPerUnit"),
            "baseline_sample_size": requested.get("baselineSampleSize"),
            "baseline_method": requested.get("baselineMethod"),
            "loaded_hourly_cost": requested.get("loadedHourlyCost"),
            "currency": spec.get("currency", "PEN"),
            "confidence": requested.get("confidence"),
            "assumptions": [
                "Replace discovery assumptions with client-reviewed evidence.",
                "Capacity value is not payroll cash savings.",
            ],
            "agreedAt": None,
        }
        write_json(out / "baselines" / f"{key}.json", baseline)

        connectors = []
        for req in connector_requirements.get(key, []):
            provider = (requested.get("providers") or {}).get(req["capability"])
            connectors.append({
                "capability": req["capability"],
                "adapterRole": req["adapterRole"],
                "provider": provider,
                "credentialRef": None,
                "requiredScopes": [],
                "verified": False,
                "verificationEvidence": None,
            })
        write_json(out / "connectors" / f"{key}.json", {
            "schemaVersion": 1,
            "workflowKey": key,
            "connectors": connectors,
        })

    write_json(out / "mk1-pilot-evidence.json", evidence_spec(tenant, workflow_rows))
    write_json(out / "role-model.json", {
        "schemaVersion": 1,
        "tenantId": tenant,
        "status": "DRAFT",
        "surfaceMode": "REDUCED_STATIC",
        "roles": {
            "client": {
                "users": [],
                "maySee": ["own process data", "own savings report", "own attention items"],
                "mustNotSee": ["technical secrets", "other tenants", "operator traces"],
            },
            "operator": {
                "users": [],
                "maySee": ["connector health", "runs", "incidents", "technical traces"],
            },
        },
        "clientAgreedAt": None,
        "evidence": None,
    })
    write_json(out / "tenant-isolation.json", {
        "schemaVersion": 1,
        "tenantId": tenant,
        "status": "DRAFT",
        "mode": "REDUCED_STATIC_SINGLE_TENANT_BOUNDARY",
        "controls": {
            "reportContainsOnlyTenantData": False,
            "credentialsExcludedFromReports": False,
            "clientDeliveryChannelAccessControlled": False,
            "operatorTechnicalArtifactsSeparated": False,
        },
        "evidence": [],
    })
    write_json(out / "ops" / "backup-restore-evidence.json", {
        "schemaVersion": 1,
        "passed": False,
        "evidence": None,
        "recordedAt": None,
        "notes": "Replace local rehearsal with evidence for the selected pilot deployment mode.",
    })
    write_json(out / "ops" / "live-incident-drill-evidence.json", {
        "schemaVersion": 1,
        "passed": False,
        "evidence": None,
        "recordedAt": None,
        "notes": "Must exercise the live-provider incident/recovery path.",
    })

    write_json(out / "deployment-decision.json", {
        "schemaVersion": 1,
        "tenantId": tenant,
        "status": "DRAFT",
        "selectedMode": None,
        "allowedModes": ["LOCAL_CRON", "EVENT_SPOOL", "SHARED_MANAGED_RUNTIME"],
        "rollbackReviewed": False,
        "backupRestoreReviewed": False,
        "incidentPathReviewed": False,
        "approvedAt": None,
        "evidence": None,
    })

    acceptance_md = f"""# Client Acceptance — {tenant}

Status: **DRAFT / NOT ACCEPTED**

## Pilot scope

Workflows:

{chr(10).join(f"- `{row['workflowKey']}@{row['version']}`" for row in workflow_rows)}

## Client acknowledgement

- [ ] configuration reviewed;
- [ ] connector/provider scopes reviewed;
- [ ] SavingsBaseline reviewed and agreed;
- [ ] cost policy accepted;
- [ ] rollback/deployment approach reviewed;
- [ ] client fixture passed;
- [ ] controlled live execution reviewed;
- [ ] reduced-surface delivery method accepted, if used;
- [ ] client acceptance explicitly recorded.

Do not convert this checklist into evidence by merely checking boxes. Final acceptance must be captured through the hashed evidence ledger used by the installation kit.
"""
    (out / "CLIENT-ACCEPTANCE.md").write_text(acceptance_md, encoding="utf-8")

    readme = f"""# MK1 Pilot Intake — {tenant}

Generated from: `{spec_path}`

This directory is deliberately **DRAFT** and contains no secrets.

## Order of work

1. fund/pay the pilot;
2. agree role model and surface mode;
3. scaffold the approved installation bundles;
4. bind credential references outside Git;
5. verify provider scopes/connectivity;
6. measure and agree each SavingsBaseline;
7. prove tenant isolation for the chosen surface;
8. run controlled live executions;
9. perform backup/restore and live-provider incident drill;
10. approve deployment/rollback;
11. record client acceptance;
12. run the MK1 gate and seal only when it passes.

```bash
python tools/savings/mk1_gate.py check --spec {out / 'mk1-pilot-evidence.json'}
```

Expected initial result: **BLOCKED**.
"""
    (out / "README.md").write_text(readme, encoding="utf-8")

    manifest = {
        "schemaVersion": 1,
        "tenantId": tenant,
        "generatedFrom": str(spec_path),
        "workflowCount": len(workflow_rows),
        "files": [
            "mk1-pilot-evidence.json",
            "role-model.json",
            "tenant-isolation.json",
            "deployment-decision.json",
            "ops/backup-restore-evidence.json",
            "ops/live-incident-drill-evidence.json",
            "CLIENT-ACCEPTANCE.md",
            "README.md",
            *[f"baselines/{row['workflowKey']}.json" for row in workflow_rows],
            *[f"connectors/{row['workflowKey']}.json" for row in workflow_rows],
        ],
        "containsSecrets": False,
        "initialGateExpectation": "BLOCKED",
    }
    write_json(out / "INTAKE-MANIFEST.json", manifest)
    return {"tenantId": tenant, "path": str(out), "workflowCount": len(workflow_rows), "manifest": manifest}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--spec", type=Path, required=True)
    ap.add_argument("--out-root", type=Path, default=ROOT / ".local/pilot")
    args = ap.parse_args()
    try:
        result = generate(args.spec.resolve(), args.out_root.resolve())
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
