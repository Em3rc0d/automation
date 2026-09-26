import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/render_rehearsal_html.py"
SPEC = importlib.util.spec_from_file_location("render_rehearsal_html", MODULE_PATH)
renderer = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(renderer)


class RehearsalHtmlTests(unittest.TestCase):
    def test_client_html_escapes_content_and_preserves_rehearsal_notice(self):
        view = {
            "productionClaim": False,
            "summary": {
                "automationCount": 1,
                "automatedUnits": 2,
                "hoursReleased": 1.5,
                "estimatedCapacityValue": 27,
                "currency": "PEN",
                "attentionItems": 1,
            },
            "workflows": [{
                "workflowKey": "<PAYMENT>",
                "automatedUnits": 2,
                "hoursReleased": 1.5,
                "estimatedCapacityValue": 27,
                "currency": "PEN",
                "attentionItems": [{"entityType": "invoice", "status": "<review>"}],
            }],
            "methodologyNotice": "Fixture only",
        }
        html = renderer.render_client(view)
        self.assertIn("&lt;PAYMENT&gt;", html)
        self.assertIn("&lt;review&gt;", html)
        self.assertIn("no es evidencia de producción", html)
        self.assertNotIn("<PAYMENT>", html)

    def test_production_claim_is_refused(self):
        with self.assertRaisesRegex(ValueError, "productionClaim=false"):
            renderer.render_client({"productionClaim": True})

    def test_manifest_detects_tampered_html(self):
        import json
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "client-portal.json").write_text(json.dumps({
                "productionClaim": False, "summary": {}, "workflows": [], "methodologyNotice": "demo"
            }))
            (root / "operator-console.json").write_text(json.dumps({
                "productionClaim": False, "paidInfrastructureRequired": False, "workflows": []
            }))
            (root / "summary.json").write_text(json.dumps({
                "productionClaim": False, "tenantId": "synthetic", "workflowCount": 2
            }))
            result = renderer.render_directory(root)
            Path(result["clientPortal"]).write_text("<!doctype html><p>tampered</p>")
            with self.assertRaisesRegex(ValueError, "hash mismatch"):
                renderer.verify_directory(root)

    def test_render_directory_writes_three_offline_files(self):
        import json
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "client-portal.json").write_text(json.dumps({
                "productionClaim": False,
                "summary": {},
                "workflows": [],
                "methodologyNotice": "demo",
            }))
            (root / "operator-console.json").write_text(json.dumps({
                "productionClaim": False,
                "paidInfrastructureRequired": False,
                "workflows": [],
            }))
            (root / "summary.json").write_text(json.dumps({
                "productionClaim": False,
                "tenantId": "synthetic",
                "workflowCount": 2,
            }))
            result = renderer.render_directory(root)
            self.assertEqual(set(result), {"index", "clientPortal", "operatorConsole", "manifest"})
            for key in ["index", "clientPortal", "operatorConsole"]:
                content = Path(result[key]).read_text()
                self.assertIn("<!doctype html>", content)
                self.assertNotIn("https://", content)
                self.assertNotIn("http://", content)
            manifest = json.loads(Path(result["manifest"]).read_text())
            self.assertFalse(manifest["productionClaim"])
            self.assertEqual(set(manifest["generatedFiles"]), {"index", "clientPortal", "operatorConsole"})
            self.assertTrue(all(not Path(x["path"]).is_absolute() for x in manifest["sourceFiles"].values()))
            verified = renderer.verify_directory(root)
            self.assertTrue(verified["valid"])
            self.assertEqual(verified["filesChecked"], 6)


if __name__ == "__main__":
    unittest.main()
