import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/backup_bundle.py"
SPEC = importlib.util.spec_from_file_location("backup_bundle", MODULE_PATH)
backup = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(backup)


class BackupBundleTests(unittest.TestCase):
    def make_bundle(self, root: Path) -> Path:
        bundle = root / "bundle"
        (bundle / "runtime-state").mkdir(parents=True)
        (bundle / "installation.json").write_text(json.dumps({
            "installationId": "inst_demo",
            "tenantId": "tenant-demo",
            "workflowKey": "PAYMENT_REMINDER_AUTOMATION",
            "workflowVersion": "0.1",
            "state": "CLIENT_CONFIGURED",
        }))
        (bundle / "config.json").write_text(json.dumps({"schedule": "0 8 * * *"}))
        (bundle / "connector-bindings.json").write_text(json.dumps({
            "bindings": [{"credentialRef": "credref:demo-google"}]
        }))
        (bundle / "runtime-state" / "audit.jsonl").write_text('{"event":"execution.completed"}\n')
        return bundle

    def test_create_verify_restore_round_trip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            archive = root / "backup.zip"
            created = backup.create_backup(
                bundle,
                archive,
                created_at="2026-09-25T12:00:00Z",
            )
            self.assertTrue(archive.is_file())
            self.assertTrue(Path(created["sidecar"]).is_file())
            self.assertFalse(created["productionControlPlaneBackup"])

            verified = backup.verify_backup(archive)
            self.assertTrue(verified["valid"])
            self.assertEqual(verified["installation"]["installationId"], "inst_demo")

            target = root / "restored"
            restored = backup.restore_backup(archive, target)
            self.assertTrue(restored["restored"])
            self.assertFalse(restored["productionControlPlaneRestore"])
            self.assertEqual(
                (target / "runtime-state" / "audit.jsonl").read_text(),
                '{"event":"execution.completed"}\n',
            )

    def test_secret_like_material_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            (bundle / "bad.json").write_text(json.dumps({"access_token": "secret-value-here"}))
            with self.assertRaisesRegex(ValueError, "secret-like material"):
                backup.create_backup(bundle, root / "backup.zip")

    def test_tampered_archive_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            archive = root / "backup.zip"
            backup.create_backup(bundle, archive, created_at="2026-09-25T12:00:00Z")
            with zipfile.ZipFile(archive, "a") as zf:
                zf.writestr("config.json", b'{"tampered":true}')
            with self.assertRaisesRegex(ValueError, "duplicate archive paths"):
                backup.verify_backup(archive)

    def test_path_traversal_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "unsafe archive path"):
            backup.safe_relative("../escape.json")


if __name__ == "__main__":
    unittest.main()
