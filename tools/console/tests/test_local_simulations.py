"""Synthetic local execution of all 12 approved workflows for AV Peru.

These are not real-provider or production tests.
"""
import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("automation_console_sims", ROOT / "tools/console/server.py")
console = importlib.util.module_from_spec(spec)
spec.loader.exec_module(console)


class LocalSimulationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        root = Path(cls.tmp.name)
        cls.data = console.ConsoleData(root / "installations", root / "catalog.sqlite3",
                                       seed_tenant_id="chifaavperu")

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_all_12_approved_synthetic_workflows_execute_without_real_providers(self):
        result = self.data.simulate_all("chifaavperu")
        detail = [(x["workflowKey"], x["status"]) for x in result["results"]]
        self.assertEqual(result["tested"], 12, detail)
        self.assertEqual(result["failed"], 0, detail)
        self.assertEqual(result["passed"], 12, detail)
        self.assertFalse(result["productionEvidence"])
        for x in result["results"]:
            self.assertEqual(x["evidenceType"], "LOCAL_SIMULATION")
            self.assertTrue(x["testedWithSyntheticData"])
            self.assertFalse(x["productionEvidence"])
            self.assertEqual(x["tenantId"], "chifaavperu")
            self.assertGreaterEqual(x["processRecords"] + x["simulatedMessages"] +
                                    x["simulatedStorageObjects"] + x["simulatedTickets"], 1)
            last = self.data.last_simulation("chifaavperu", x["workflowKey"])
            self.assertEqual(last["runnerOutputSha256"], x["runnerOutputSha256"])
        self.assertEqual(self.data.tenant_plan("chifaavperu")["installedTotal"], 12)
        self.assertTrue(all(x["state"] == "DRAFT"
                            for x in self.data.tenant_plan("chifaavperu")["entries"]
                            if x["installable"]))

    def test_simulator_refuses_unapproved_workflow(self):
        with self.assertRaises(console.ConsoleError):
            self.data.simulate("chifaavperu", "LEAD_NORMALIZE_AUTOMATION")

    def test_unseeded_tenant_does_not_get_any_installations(self):
        self.assertEqual(self.data.tenant_plan("unseeded")["assignedTotal"], 0)
        self.assertEqual(self.data.installations("unseeded"), [])


if __name__ == "__main__":
    unittest.main()
