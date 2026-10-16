"""Local Operator Console API and configuration safety tests (stdlib only)."""
import importlib.util
import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("operator_console_server", ROOT / "tools/console/server.py")
console = importlib.util.module_from_spec(spec)
spec.loader.exec_module(console)


class SchemaTests(unittest.TestCase):
    def test_rejects_unknown_and_wrong_types(self):
        schema = {"type": "object", "properties": {
            "enabled": {"type": "boolean"}, "days": {"type": "array",
                "minItems": 1, "uniqueItems": True,
                "items": {"type": "integer", "minimum": -5, "maximum": 30}}
        }, "required": ["enabled", "days"], "additionalProperties": False}
        self.assertEqual(console.validate_schema({"enabled": True, "days": [0, 7]}, schema), [])
        self.assertTrue(console.validate_schema({"enabled": 1, "days": [3, 3]}, schema))
        self.assertTrue(console.validate_schema({"enabled": True, "days": [31]}, schema))
        self.assertTrue(console.validate_schema({"enabled": True, "days": [0], "secret": "x"}, schema))
        self.assertTrue(console.validate_schema({"enabled": True, "days": [0]},
                                                {"type": "object", "format": "unknown"}))

    def test_tenant_path_not_accepted(self):
        for value in ("../etc", "TALLER", "with.dot", "", "cliente/otro", "-bad"):
            with self.assertRaises(console.ConsoleError):
                console.valid_tenant(value)


class APIIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.data = console.ConsoleData(Path(cls.tmp.name))
        cls.http = console.create_server(cls.data, port=0)
        cls.port = cls.http.server_address[1]
        cls.base = f"http://127.0.0.1:{cls.port}"
        cls.thread = threading.Thread(target=cls.http.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()
        cls.thread.join(timeout=2)
        cls.tmp.cleanup()

    def request(self, path, method="GET", body=None, token=None, origin=None):
        headers = {}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if token is not None:
            headers["X-Console-Token"] = token
        if origin is not None:
            headers["Origin"] = origin
        req = Request(self.base + path, method=method, headers=headers,
                      data=json.dumps(body).encode() if body is not None else None)
        try:
            with urlopen(req, timeout=5) as response:
                return response.status, json.loads(response.read())
        except HTTPError as e:
            return e.code, json.loads(e.read())

    def test_01_catalog_and_bootstrap(self):
        status, boot = self.request("/api/bootstrap")
        self.assertEqual(status, 200)
        self.assertFalse(boot["productionClaim"])
        self.__class__.token = boot["token"]
        status, result = self.request("/api/catalog")
        self.assertEqual(status, 200)
        self.assertGreaterEqual(len(result["entries"]), 12)
        approved = [x for x in result["entries"] if x["installable"]]
        self.assertGreaterEqual(len(approved), 12)
        self.assertFalse(any(x["installable"] for x in result["entries"] if x["stage"] != "APPROVED_BASELINE"))

    def test_02_wrong_origin_and_token_blocked(self):
        body = {"tenantId": "client-test", "workflowKey": "LEAD_INTAKE_AUTOMATION"}
        status, _ = self.request("/api/install", "POST", body, self.token, "https://evil.example")
        self.assertEqual(status, 403)
        status, _ = self.request("/api/install", "POST", body, "bad-token", self.base)
        self.assertEqual(status, 403)
        status, _ = self.request("/api/install", "POST", body, None, self.base)
        self.assertEqual(status, 403)

    def test_03_install_approved_and_diagnose(self):
        body = {"tenantId": "client-test", "workflowKey": "LEAD_INTAKE_AUTOMATION"}
        status, detail = self.request("/api/install", "POST", body, self.token, self.base)
        self.assertEqual(status, 201, detail)
        self.assertEqual(detail["installation"]["state"], "DRAFT")
        self.assertFalse(detail["diagnostics"]["ready"])
        self.assertGreater(len(detail["diagnostics"]["blockers"]), 0)
        self.assertNotIn("credentialRef", json.dumps(detail))
        status, _ = self.request("/api/install", "POST", body, self.token, self.base)
        self.assertEqual(status, 409)
        status, _ = self.request("/api/install", "POST",
                                 {"tenantId": "other", "workflowKey": "LEAD_NORMALIZE_AUTOMATION"},
                                 self.token, self.base)
        self.assertEqual(status, 409)
        self.__class__.version = detail["configVersion"]

    def test_04_validate_and_persist_edit_with_conflict_detection(self):
        query = "/api/config?tenant=client-test&key=LEAD_INTAKE_AUTOMATION"
        config = {"enabled": False, "dryRun": True, "businessTimezone": "America/Lima",
                  "acceptedSourceSystems": ["email"]}
        status, bad = self.request(query, "PUT",
                                   {"config": {**config, "access_token": "secret"}, "configVersion": self.version},
                                   self.token, self.base)
        self.assertEqual(status, 400)
        status, detail = self.request(query, "PUT", {"config": config, "configVersion": self.version},
                                      self.token, self.base)
        self.assertEqual(status, 200, detail)
        self.assertFalse(detail["config"]["enabled"])
        self.assertNotEqual(detail["configVersion"], self.version)
        status, _ = self.request(query, "PUT", {"config": config, "configVersion": self.version},
                                  self.token, self.base)
        self.assertEqual(status, 409)
        saved = self.data.detail("client-test", "LEAD_INTAKE_AUTOMATION")
        self.assertEqual(saved["config"], config)
        self.assertEqual(saved["installation"]["state"], "DRAFT")
        self.assertFalse(saved["diagnostics"]["ready"])

    def test_05_portal_and_cross_tenant_are_scoped(self):
        status, portal = self.request("/api/portal?tenant=client-test")
        self.assertEqual(status, 200)
        self.assertFalse(portal["productionClaim"])
        self.assertEqual(len(portal["workflows"]), 1)
        status, another = self.request("/api/portal?tenant=another")
        self.assertEqual(status, 200)
        self.assertEqual(len(another["workflows"]), 0)
        status, _ = self.request("/api/installation?tenant=another&key=LEAD_INTAKE_AUTOMATION")
        self.assertEqual(status, 404)

    def test_06_reject_host_header_and_secrets(self):
        headers = {"Host": "not-local.test"}
        req = Request(self.base + "/api/overview", headers=headers)
        with self.assertRaises(HTTPError) as error:
            urlopen(req, timeout=5)
        self.assertEqual(error.exception.code, 403)
        conf = self.data.detail("client-test", "LEAD_INTAKE_AUTOMATION")
        conf["config"]["businessTimezone"] = "sk-12345678901234567890"
        with self.assertRaises(console.ConsoleError):
            self.data.update_config("client-test", "LEAD_INTAKE_AUTOMATION",
                                    conf["config"], conf["configVersion"])


if __name__ == "__main__":
    unittest.main()
