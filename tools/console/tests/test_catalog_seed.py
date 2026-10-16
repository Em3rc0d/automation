"""Automation Console catalog seed: full-registry, restart and safety invariants."""
import importlib.util
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "tools" / "console" / "catalog_seed.py"
spec = importlib.util.spec_from_file_location("automation_catalog_seed_test", SCRIPT)
seed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed)


class CatalogSeedTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name)
        self.db = self.path / "catalog.sqlite3"

    def test_all_workflows_seeded_and_restart_is_idempotent(self):
        source = json.loads(seed.SOURCE.read_text(encoding="utf-8"))
        result = seed.seed_catalog(seed.SOURCE, self.db)
        self.assertEqual(result["catalogTotal"], source["count"])
        self.assertEqual(result["catalogTotal"], 233)
        self.assertEqual(result["approvedTotal"], 12)
        self.assertEqual(result["designReadyTotal"], 221)
        self.assertEqual(result["inserted"], 233)
        self.assertEqual(result["updated"], 0)
        self.assertEqual(len(seed.list_catalog(self.db)), 233)
        assert sum(x["installable"] for x in seed.list_catalog(self.db)) == 12
        again = seed.seed_catalog(seed.SOURCE, self.db)
        self.assertEqual(again["inserted"], 0)
        self.assertEqual(again["updated"], 0)
        self.assertEqual(again["unchanged"], 233)
        self.assertEqual(again["withdrawn"], 0)
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute("SELECT COUNT(*) FROM automation_catalog").fetchone()[0], 233)

    def test_changes_upsert_and_removed_entries_are_retained_inactive(self):
        doc = json.loads(seed.SOURCE.read_text(encoding="utf-8"))
        original = seed.seed_catalog(seed.SOURCE, self.db)
        changed_key = doc["entries"][0]["key"]
        removed_key = doc["entries"][-1]["key"]
        doc["entries"][0]["name"] = "New name after versioned registry update"
        doc["entries"].pop()
        doc["count"] = len(doc["entries"])
        modified = self.path / "changed.json"
        modified.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        changed = seed.seed_catalog(modified, self.db)
        self.assertEqual(changed["catalogTotal"], original["catalogTotal"] - 1)
        self.assertEqual(changed["inserted"], 0)
        self.assertEqual(changed["updated"], 1)
        self.assertEqual(changed["withdrawn"], 1)
        self.assertEqual(changed["unchanged"], original["catalogTotal"] - 2)
        catalog = seed.list_catalog(self.db)
        self.assertNotIn(removed_key, {x["key"] for x in catalog})
        self.assertEqual(next(x["name"] for x in catalog if x["key"] == changed_key),
                         "New name after versioned registry update")
        with sqlite3.connect(self.db) as db:
            self.assertEqual(db.execute(
                "SELECT source_present FROM automation_catalog WHERE workflow_key=?",
                (removed_key,)).fetchone()[0], 0)
            self.assertEqual(db.execute("SELECT COUNT(*) FROM automation_catalog").fetchone()[0], 233)

    def test_bad_registry_refuses_changes_and_keeps_existing_catalog(self):
        seed.seed_catalog(seed.SOURCE, self.db)
        doc = json.loads(seed.SOURCE.read_text(encoding="utf-8"))
        doc["entries"].append(doc["entries"][0])
        doc["count"] = len(doc["entries"])
        corrupt = self.path / "corrupt.json"
        corrupt.write_text(json.dumps(doc), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            seed.seed_catalog(corrupt, self.db)
        self.assertEqual(len(seed.list_catalog(self.db)), 233)
        doc["count"] = len(doc["entries"]) + 1
        corrupt.write_text(json.dumps(doc), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "count"):
            seed.seed_catalog(corrupt, self.db)
        self.assertEqual(len(seed.list_catalog(self.db)), 233)

    def test_seed_never_creates_client_installations(self):
        installations = self.path / "installations"
        seed.seed_catalog(seed.SOURCE, self.db)
        self.assertFalse(installations.exists())
        self.assertFalse((self.path / "chifaavperu").exists())


if __name__ == "__main__":
    unittest.main()
