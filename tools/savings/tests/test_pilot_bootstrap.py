import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/pilot_bootstrap.py"
SPEC = importlib.util.spec_from_file_location("pilot_bootstrap", MODULE_PATH)
pilot = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(pilot)


class PilotBootstrapTests(unittest.TestCase):
    def base_spec(self):
        return {
            "tenantId": "demo-mype",
            "currency": "PEN",
            "workflows": [
                {
                    "key": "PAYMENT_REMINDER_AUTOMATION",
                    "monthlyUnits": 120,
                    "manualMinutesPerUnit": 4,
                    "estimatedHumanMinutesAfterAutomation": 0.5,
                    "loadedHourlyCost": 18,
                    "baselineMethod": "client_declared",
                    "baselineSampleSize": 20,
                    "confidence": "low",
                    "providers": {
                        "records.accounts_receivable.read": "google_sheets",
                        "messaging.send": "gmail",
                    },
                }
            ],
        }

    def test_plan_has_zero_paid_infrastructure_and_economics(self):
        plan = pilot.build_plan(self.base_spec())
        self.assertEqual(plan["workflowCount"], 1)
        self.assertFalse(plan["infrastructure"]["preRevenueFixedPaidInfrastructureRequired"])
        self.assertFalse(plan["infrastructure"]["dedicatedTenantRuntimeRequired"])
        economics = plan["workflows"][0]["discoveryEconomics"]
        self.assertAlmostEqual(economics["estimatedMonthlyHoursReleased"], 7.0)
        self.assertAlmostEqual(economics["estimatedMonthlyCapacityValue"], 126.0)
        self.assertIn("payroll cash savings", economics["warning"])

    def test_unknown_or_unapproved_workflow_fails_closed(self):
        spec = self.base_spec()
        spec["workflows"][0]["key"] = "LEAD_NORMALIZE_AUTOMATION"
        with self.assertRaisesRegex(ValueError, "not APPROVED_BASELINE"):
            pilot.build_plan(spec)

    def test_unsupported_provider_is_a_blocker_not_fake_verification(self):
        spec = self.base_spec()
        spec["workflows"][0]["providers"]["messaging.send"] = "google_sheets"
        plan = pilot.build_plan(spec)
        blockers = plan["workflows"][0]["blockersBeforeClientConfigured"]
        self.assertTrue(any("does not support messaging.send" in item for item in blockers))
        connector = next(
            item for item in plan["workflows"][0]["connectors"]
            if item["capability"] == "messaging.send"
        )
        self.assertFalse(connector["providerSupported"])
        self.assertTrue(connector["liveVerificationRequiredLater"])

    def test_secret_like_material_is_rejected(self):
        spec = self.base_spec()
        spec["apiKey"] = "sk-this-should-never-be-in-a-pilot-spec"
        with self.assertRaisesRegex(ValueError, "secret"):
            pilot.build_plan(spec)

    def test_scaffold_prefills_baseline_but_does_not_agree_or_configure(self):
        spec = self.base_spec()
        with tempfile.TemporaryDirectory() as tmp:
            result = pilot.scaffold_pilot(
                spec,
                Path(tmp),
                created_at="2026-09-25T12:00:00Z",
            )
            bundle = Path(result["bundles"][0])
            baseline = json.loads((bundle / "savings-baseline.json").read_text())
            installation = json.loads((bundle / "installation.json").read_text())
            connectors = json.loads((bundle / "connector-bindings.json").read_text())
            self.assertEqual(baseline["status"], "DRAFT")
            self.assertIsNone(baseline["agreedAt"])
            self.assertEqual(baseline["manual_minutes_per_unit"], 4)
            self.assertEqual(installation["state"], "DRAFT")
            self.assertTrue(all(binding["status"] == "unbound" for binding in connectors["bindings"]))
            self.assertTrue(Path(result["planPath"]).is_file())


if __name__ == "__main__":
    unittest.main()
