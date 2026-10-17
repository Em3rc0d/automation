"""Full AV Peru tenant seed: 233 planned; only 12 approved DRAFT installations."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "tools" / "console" / "tenant_seed.py"
spec = importlib.util.spec_from_file_location("tenant_seed_test", SCRIPT)
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


class TenantSeedTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.db = self.root / "catalog.sqlite3"
        self.installations = self.root / "installations"
        seed.catalog_seed.seed_catalog(seed.catalog_seed.SOURCE, self.db)

    def test_seed_assigns_all_233_without_faking_production(self):
        result = seed.seed_tenant("chifaavperu", self.db, self.installations)
        self.assertEqual(result["catalogAssigned"], 233)
        self.assertEqual(result["approvedBaselines"], 12)
        self.assertEqual(result["designOnly"], 221)
        self.assertEqual(result["newDraftBundles"], 12)
        self.assertFalse(result["productionClaim"])
        self.assertFalse(result["providerExecution"])
        plan = seed.tenant_plan("chifaavperu", self.db, self.installations)
        self.assertEqual(plan["assignedTotal"], 233)
        self.assertEqual(plan["installedTotal"], 12)
        self.assertEqual(plan["designOnlyTotal"], 221)
        self.assertEqual(len(plan["entries"]), 233)
        self.assertEqual(
            len([x for x in plan["entries"] if x["state"] == "DESIGN_ONLY"]), 221)
        self.assertEqual(
            len([x for x in plan["entries"] if x["state"] == "DRAFT"]), 12)
        for path in (self.installations / "chifaavperu").glob("*/installation.json"):
            info = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(info["state"], "DRAFT")
            self.assertEqual(info["tenantId"], "chifaavperu")
        self.assertEqual(len(list((self.installations / "chifaavperu").glob("*/installation.json"))), 12)

    def test_restart_preserves_user_configuration_and_other_tenants(self):
        # Start with an existing configured local draft; seed must not rewrite it.
        bundle = seed.installer.scaffold(
            "SUPPORT_INTAKE_AUTOMATION", "chifaavperu", self.installations,
            created_at="2026-10-16T00:00:00Z"
        )
        config = bundle / "config.json"
        obj = json.loads(config.read_text(encoding="utf-8"))
        obj["defaultStatus"] = "pending_review"
        config.write_text(json.dumps(obj), encoding="utf-8")
        another = seed.installer.scaffold(
            "SUPPORT_INTAKE_AUTOMATION", "other-tenant", self.installations
        )
        other_before = (another / "config.json").read_bytes()
        config_before = config.read_bytes()
        first = seed.seed_tenant("chifaavperu", self.db, self.installations)
        self.assertEqual(first["newDraftBundles"], 11)
        self.assertEqual(first["existingBundlesPreserved"], 1)
        again = seed.seed_tenant("chifaavperu", self.db, self.installations)
        self.assertEqual(again["newDraftBundles"], 0)
        self.assertEqual(again["existingBundlesPreserved"], 12)
        self.assertEqual(config.read_bytes(), config_before)
        self.assertEqual((another / "config.json").read_bytes(), other_before)
        self.assertEqual(seed.tenant_plan("other-tenant", self.db, self.installations)["assignedTotal"], 0)

    def test_invalid_tenant_or_corrupt_existing_bundle_fails_closed(self):
        with self.assertRaises(ValueError):
            seed.seed_tenant("../escape", self.db, self.installations)
        broken = self.installations / "chifaavperu" / "SUPPORT_INTAKE_AUTOMATION@0.1"
        broken.mkdir(parents=True)
        with self.assertRaisesRegex(ValueError, "corrupt"):
            seed.seed_tenant("chifaavperu", self.db, self.installations)
        self.assertFalse((broken / "installation.json").exists())


if __name__ == "__main__":
    unittest.main()
