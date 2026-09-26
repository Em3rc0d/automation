from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/launch_pilot.py"
spec = importlib.util.spec_from_file_location("launch_pilot", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


class LaunchPilotTests(unittest.TestCase):
    def test_launch_creates_bundles_and_blocked_evidence_pack(self):
        source = ROOT / "operations/savings/examples/pilot-preflight.example.json"
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            result = module.launch(
                source,
                tmp / "installations",
                tmp / "pilot",
            )
            self.assertEqual(result["tenantId"], "demo-mype")
            self.assertEqual(result["workflowCount"], 2)
            self.assertEqual(result["initialGate"], "BLOCKED")
            self.assertEqual(len(result["bundles"]), 2)
            evidence = json.loads(Path(result["mk1EvidenceSpec"]).read_text())
            self.assertEqual(len(evidence["workflows"]), 2)
            for item in evidence["workflows"]:
                self.assertTrue(Path(item["bundlePath"]).is_dir())
            self.assertTrue(result["initialBlockers"])

    def test_launch_refuses_overwrite(self):
        source = ROOT / "operations/savings/examples/pilot-preflight.example.json"
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            module.launch(source, tmp / "installations", tmp / "pilot")
            with self.assertRaises(FileExistsError):
                module.launch(source, tmp / "installations", tmp / "pilot")


if __name__ == "__main__":
    unittest.main()
