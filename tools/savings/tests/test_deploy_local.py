#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/deploy_local.py"
SPEC = importlib.util.spec_from_file_location("deploy_local", MODULE_PATH)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


class LocalDeploymentTests(unittest.TestCase):
    def make_bundle(self, root: Path, *, schedule="0 8 * * *", state="CLIENT_CONFIGURED") -> Path:
        bundle = root / "bundle"
        bundle.mkdir()
        (bundle / "installation.json").write_text(json.dumps({
            "installationId": "inst_test",
            "tenantId": "tenant-test",
            "workflowKey": "PAYMENT_REMINDER_AUTOMATION",
            "workflowVersion": "0.1",
            "state": state,
            "dedicatedInfrastructure": False,
        }), encoding="utf-8")
        (bundle / "config.json").write_text(json.dumps({
            "schedule": schedule,
        }), encoding="utf-8")
        return bundle

    def test_generate_cron_writes_no_secret_material(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            bundle = self.make_bundle(root)
            env_file = Path("/etc/automation/tenant-test.env")
            result = mod.generate_cron(
                bundle,
                root / "out",
                repo_root=ROOT,
                node="/usr/bin/node",
                env_file=env_file,
            )
            wrapper = Path(result["wrapper"]).read_text(encoding="utf-8")
            cron = Path(result["crontab"]).read_text(encoding="utf-8")
            self.assertIn("--confirm-live-side-effects YES", wrapper)
            self.assertIn(str(env_file), wrapper)
            self.assertNotIn("accessToken", wrapper)
            self.assertNotIn("clientSecret", wrapper)
            self.assertIn("0 8 * * *", cron)
            self.assertFalse(result["paidInfrastructureProvisioned"])
            self.assertFalse(result["secretMaterialWritten"])

    def test_unsafe_cron_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = self.make_bundle(Path(tmp), schedule="0 8 * * *; curl bad")
            with self.assertRaisesRegex(ValueError, "five-field|unsafe"):
                mod.deployment_plan(bundle)

    def test_event_workflow_has_no_scheduled_cron(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = self.make_bundle(Path(tmp), schedule=None)
            plan = mod.deployment_plan(bundle)
            self.assertEqual(plan["mode"], "event")
            with self.assertRaisesRegex(ValueError, "no schedule"):
                mod.generate_cron(bundle, Path(tmp) / "out")


if __name__ == "__main__":
    unittest.main()
