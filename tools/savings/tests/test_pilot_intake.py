from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/pilot_intake.py"
spec = importlib.util.spec_from_file_location("pilot_intake", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


class PilotIntakeTests(unittest.TestCase):
    def test_generate_creates_zero_secret_blocked_pack(self):
        source = ROOT / "operations/savings/examples/pilot-preflight.example.json"
        with tempfile.TemporaryDirectory() as tmp:
            result = module.generate(source, Path(tmp))
            out = Path(result["path"])
            self.assertTrue((out / "mk1-pilot-evidence.json").is_file())
            self.assertTrue((out / "role-model.json").is_file())
            self.assertTrue((out / "tenant-isolation.json").is_file())
            self.assertTrue((out / "deployment-decision.json").is_file())
            self.assertTrue((out / "CLIENT-ACCEPTANCE.md").is_file())
            manifest = json.loads((out / "INTAKE-MANIFEST.json").read_text())
            self.assertFalse(manifest["containsSecrets"])
            self.assertEqual(manifest["initialGateExpectation"], "BLOCKED")
            evidence = json.loads((out / "mk1-pilot-evidence.json").read_text())
            self.assertEqual(evidence["pilot"]["fundingStatus"], "UNFUNDED")
            self.assertTrue(all(not gate["passed"] for gate in evidence["gates"].values()))
            self.assertEqual(len(list((out / "baselines").glob("*.json"))), 2)
            self.assertEqual(len(list((out / "connectors").glob("*.json"))), 2)

    def test_baseline_stays_draft(self):
        source = ROOT / "operations/savings/examples/pilot-preflight.example.json"
        with tempfile.TemporaryDirectory() as tmp:
            result = module.generate(source, Path(tmp))
            out = Path(result["path"])
            for path in (out / "baselines").glob("*.json"):
                baseline = json.loads(path.read_text())
                self.assertEqual(baseline["status"], "DRAFT")
                self.assertIsNone(baseline["agreedAt"])


if __name__ == "__main__":
    unittest.main()
