from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/mk1_evidence_sync.py"
spec = importlib.util.spec_from_file_location("mk1_evidence_sync", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def write(path: Path, value: object):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value), encoding="utf-8")


class EvidenceSyncTests(unittest.TestCase):
    def test_missing_artifacts_remain_false(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec_path = root / "mk1-pilot-evidence.json"
            write(spec_path, {
                "schemaVersion": 1,
                "tenantId": "t",
                "pilot": {"fundingStatus": "PAID", "clientNameRef": "x", "operatorOwner": "o"},
                "surface": {"mode": "HOSTED_PORTAL", "clientAgreementEvidence": None, "deliveryChannel": None},
                "workflows": [],
                "gates": {},
            })
            result = module.sync(spec_path)
            self.assertFalse(result["derived"]["roleModelAgreed"]["passed"])
            self.assertFalse(result["derived"]["providerAccountBound"]["passed"])
            self.assertFalse(result["derived"]["tenantIsolationProved"]["passed"])
            self.assertFalse(result["derived"]["backupRestorePassed"]["passed"])

    def test_workspace_artifacts_derive_non_bundle_gates(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            spec_path = root / "mk1-pilot-evidence.json"
            write(spec_path, {
                "schemaVersion": 1,
                "tenantId": "t",
                "pilot": {"fundingStatus": "PAID", "clientNameRef": "x", "operatorOwner": "o"},
                "surface": {"mode": "HOSTED_PORTAL", "clientAgreementEvidence": None, "deliveryChannel": None},
                "workflows": [],
                "gates": {},
            })
            write(root / "role-model.json", {
                "status": "AGREED", "clientAgreedAt": "2026-09-26T00:00:00Z", "evidence": "client-ref"
            })
            write(root / "tenant-isolation.json", {
                "status": "PROVED",
                "controls": {"a": True, "b": True},
                "evidence": ["isolation-report"],
            })
            write(root / "deployment-decision.json", {
                "status": "APPROVED",
                "selectedMode": "LOCAL_CRON",
                "rollbackReviewed": True,
                "backupRestoreReviewed": True,
                "incidentPathReviewed": True,
                "approvedAt": "2026-09-26T00:00:00Z",
                "evidence": "deployment-review",
            })
            write(root / "ops/backup-restore-evidence.json", {
                "schemaVersion": 1, "passed": True, "evidence": "restore-log", "recordedAt": "2026-09-26T00:00:00Z"
            })
            write(root / "ops/live-incident-drill-evidence.json", {
                "schemaVersion": 1, "passed": True, "evidence": "incident-log", "recordedAt": "2026-09-26T00:00:00Z"
            })
            result = module.sync(spec_path)
            self.assertTrue(result["derived"]["roleModelAgreed"]["passed"])
            self.assertTrue(result["derived"]["tenantIsolationProved"]["passed"])
            self.assertTrue(result["derived"]["deploymentRollbackApproved"]["passed"])
            self.assertTrue(result["derived"]["backupRestorePassed"]["passed"])
            self.assertTrue(result["derived"]["incidentDrillPassed"]["passed"])


if __name__ == "__main__":
    unittest.main()
