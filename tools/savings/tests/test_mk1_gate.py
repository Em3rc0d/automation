from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/mk1_gate.py"
spec = importlib.util.spec_from_file_location("mk1_gate", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


class MK1GateTests(unittest.TestCase):
    def base_spec(self):
        gates = {
            name: {"passed": True, "evidence": f"evidence/{name}.json", "notes": None}
            for name in module.REQUIRED_GATES
        }
        return {
            "schemaVersion": 1,
            "tenantId": "tenant-a",
            "pilot": {
                "fundingStatus": "PAID",
                "clientNameRef": "client-ref",
                "operatorOwner": "operator",
            },
            "surface": {
                "mode": "HOSTED_PORTAL",
                "clientAgreementEvidence": None,
                "deliveryChannel": None,
            },
            "workflows": [
                {"key": "PAYMENT_REMINDER_AUTOMATION", "bundlePath": ".local/test/payment"},
                {"key": "APPOINTMENT_REMINDER_AUTOMATION", "bundlePath": ".local/test/appointment"},
            ],
            "gates": gates,
        }

    def test_blocked_example_is_blocked(self):
        value = module.read_json(ROOT / "operations/savings/examples/mk1-pilot-evidence.blocked.example.json")
        result = module.evaluate(value)
        self.assertFalse(result["readyForMK1Certification"])
        self.assertIn("paying/funded pilot not yet confirmed", result["blockers"])

    def test_passed_gate_requires_evidence(self):
        value = self.base_spec()
        value["gates"]["providerAccountBound"]["evidence"] = None
        result = module.evaluate(value)
        self.assertFalse(result["readyForMK1Certification"])
        self.assertTrue(any("cannot pass without evidence" in x for x in result["errors"]))

    def test_reduced_surface_requires_client_agreement_and_channel(self):
        value = self.base_spec()
        value["surface"] = {
            "mode": "REDUCED_STATIC",
            "clientAgreementEvidence": None,
            "deliveryChannel": None,
        }
        result = module.evaluate(value)
        self.assertIn("reduced surface requires explicit client agreement evidence", result["blockers"])
        self.assertIn("reduced surface requires client-approved access-controlled delivery channel", result["blockers"])

    def test_unknown_workflow_is_error(self):
        value = self.base_spec()
        value["workflows"][0]["key"] = "DOES_NOT_EXIST"
        result = module.evaluate(value)
        self.assertTrue(any("unknown workflow" in x for x in result["errors"]))

    def test_seal_refuses_incomplete_evidence(self):
        value = self.base_spec()
        value["pilot"]["fundingStatus"] = "UNFUNDED"
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            spec_path = tmp / "spec.json"
            out = tmp / "seal.json"
            spec_path.write_text(json.dumps(value), encoding="utf-8")
            with self.assertRaises(ValueError):
                module.seal(spec_path, out)


if __name__ == "__main__":
    unittest.main()
