#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tarfile
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/backup_bundle.py"
SPEC = importlib.util.spec_from_file_location("backup_bundle", MODULE_PATH)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


class BackupBundleTests(unittest.TestCase):
    def make_bundle(self, root: Path) -> Path:
        bundle = root / "tenant-a" / "PAYMENT_REMINDER_AUTOMATION@0.1"
        bundle.mkdir(parents=True)
        (bundle / "installation.json").write_text(json.dumps({
            "tenantId": "tenant-a",
            "installationId": "inst-001",
            "workflowKey": "PAYMENT_REMINDER_AUTOMATION",
            "workflowVersion": "0.1",
            "state": "CLIENT_CONFIGURED"
        }), encoding="utf-8")
        (bundle / "config.json").write_text('{"enabled":true}\n', encoding="utf-8")
        state = bundle / "runtime-state" / "audit"
        state.mkdir(parents=True)
        (state / "control-plane.jsonl").write_text('{"action":"test"}\n', encoding="utf-8")
        return bundle

    def test_create_verify_restore_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            archive = root / "backup.tar.gz"
            manifest = mod.create_backup(bundle, archive, "2026-09-25T12:00:00Z")
            self.assertFalse(manifest["secretMaterialIncluded"])
            self.assertEqual(archive.stat().st_mode & 0o777, 0o600)

            verified = mod.verify_backup(archive)
            self.assertTrue(verified["valid"])
            self.assertEqual(verified["workflowKey"], "PAYMENT_REMINDER_AUTOMATION")
            self.assertGreaterEqual(verified["filesChecked"], 3)

            restored = root / "restored"
            mod.restore_backup(archive, restored)
            self.assertEqual(
                json.loads((restored / "installation.json").read_text())["installationId"],
                "inst-001",
            )
            self.assertEqual(
                (restored / "runtime-state/audit/control-plane.jsonl").read_text(),
                '{"action":"test"}\n',
            )

    def test_refuses_secret_like_file_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            (bundle / ".env").write_text("TOKEN=do-not-back-up\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "secret-like"):
                mod.create_backup(bundle, root / "backup.tar.gz")

    def test_refuses_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            (bundle / "link").symlink_to(bundle / "config.json")
            with self.assertRaisesRegex(ValueError, "symlink"):
                mod.create_backup(bundle, root / "backup.tar.gz")

    def test_verify_detects_modified_member(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            archive = root / "backup.tar.gz"
            mod.create_backup(bundle, archive)

            unpack = root / "unpack"
            unpack.mkdir()
            with tarfile.open(archive, "r:gz") as tar:
                tar.extractall(unpack)
            (unpack / "bundle/config.json").write_text('{"enabled":false}\n', encoding="utf-8")
            tampered = root / "tampered.tar.gz"
            with tarfile.open(tampered, "w:gz") as tar:
                for path in sorted(unpack.rglob("*")):
                    if path.is_file():
                        tar.add(path, arcname=path.relative_to(unpack).as_posix())
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                mod.verify_backup(tampered)


if __name__ == "__main__":
    unittest.main()
