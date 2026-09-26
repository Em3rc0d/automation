#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/rehearse_pilot.py"
SPEC = importlib.util.spec_from_file_location("rehearse_pilot", MODULE_PATH)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


class PilotRehearsalTests(unittest.TestCase):
    def test_two_workflow_rehearsal_proves_local_value_loop_without_faking_production(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out"
            summary = mod.run_rehearsal(ROOT / "mk1/rehearsal/pilot-plan.json", out)

            self.assertFalse(summary["productionClaim"])
            self.assertFalse(summary["paidInfrastructureRequired"])
            self.assertEqual(summary["workflowCount"], 2)
            self.assertEqual(
                set(summary["workflowKeys"]),
                {"PAYMENT_REMINDER_AUTOMATION", "APPOINTMENT_REMINDER_AUTOMATION"},
            )
            self.assertTrue(summary["localSimulationPassed"])
            self.assertFalse(summary["clientConfigured"])
            self.assertFalse(summary["clientAccepted"])
            self.assertEqual(summary["operator"]["totalIncidents"], 0)
            self.assertGreater(summary["operator"]["totalRuns"], 0)
            self.assertGreater(summary["operator"]["totalProcessRecords"], 0)
            self.assertGreater(summary["operator"]["totalSavingsEvents"], 0)
            self.assertGreater(summary["clientPortal"]["automatedUnits"], 0)

            for blockers in summary["remainingRealPilotGates"].values():
                self.assertTrue(any("connector not verified" in blocker for blocker in blockers))
                self.assertTrue(any("credentialRef" in blocker for blocker in blockers))

            client = json.loads((out / "client-portal.json").read_text(encoding="utf-8"))
            operator = json.loads((out / "operator-console.json").read_text(encoding="utf-8"))
            self.assertEqual(client["surface"], "CLIENT_PORTAL_REHEARSAL")
            self.assertEqual(operator["surface"], "OPERATOR_CONSOLE_REHEARSAL")
            self.assertFalse(client["productionClaim"])
            self.assertFalse(operator["productionClaim"])

    def test_plan_refuses_production_claim(self):
        with tempfile.TemporaryDirectory() as tmp:
            plan = json.loads((ROOT / "mk1/rehearsal/pilot-plan.json").read_text(encoding="utf-8"))
            plan["productionClaim"] = True
            path = Path(tmp) / "bad-plan.json"
            path.write_text(json.dumps(plan), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "productionClaim=false"):
                mod.run_rehearsal(path, Path(tmp) / "out")


if __name__ == "__main__":
    unittest.main()
