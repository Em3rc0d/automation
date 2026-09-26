#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "tools/savings/install_approved.py"
SPEC = importlib.util.spec_from_file_location("install_approved", MODULE_PATH)
mod = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(mod)


class InstallerTests(unittest.TestCase):
    def test_approved_catalog_has_twelve_workflows_and_connector_contracts(self):
        approved = mod.approved_entries()
        self.assertEqual(len(approved), 12)
        requirements = mod.connector_requirements()
        self.assertEqual({x["key"] for x in approved}, set(requirements))

    def test_scaffold_is_draft_and_contains_no_secret_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "PAYMENT_REMINDER_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            installation = mod.read_json(bundle / "installation.json")
            connectors = mod.read_json(bundle / "connector-bindings.json")
            self.assertEqual(installation["state"], "DRAFT")
            self.assertFalse(installation["dedicatedInfrastructure"])
            self.assertTrue(all(x["credentialRef"] is None for x in connectors["bindings"]))
            self.assertEqual(mod.assert_safe_tree(connectors), [])

    def test_doctor_blocks_unconfigured_bundle(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "APPOINTMENT_REMINDER_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            result = mod.diagnose(bundle, "CLIENT_CONFIGURED")
            self.assertFalse(result["ready"])
            self.assertTrue(any("connector not verified" in x for x in result["blockers"]))
            self.assertTrue(any("baseline incomplete" in x for x in result["blockers"]))

    def test_payment_reminder_can_reach_client_configured_without_secrets(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "PAYMENT_REMINDER_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            mod.set_binding(
                bundle,
                "records.accounts_receivable.read",
                "google_sheets",
                "credref:sheet-demo",
                ["spreadsheets.readonly"],
                {"spreadsheetId": "sheet-demo", "range": "Invoices!A:Z"},
            )
            mod.set_binding(bundle, "messaging.send", "gmail", "credref:gmail-demo", ["mail.send"], {})
            mod.record_connector_verification(
                bundle,
                "records.accounts_receivable.read",
                "evidence/sheets-check.json",
                "google_sheets",
                "2026-09-25T00:30:00Z",
            )
            mod.record_connector_verification(
                bundle,
                "messaging.send",
                "evidence/gmail-check.json",
                "gmail",
                "2026-09-25T00:31:00Z",
            )
            args = argparse.Namespace(
                manual_minutes=4.0,
                sample_size=30,
                method="time_study",
                hourly_cost=18.0,
                currency="PEN",
                confidence="medium",
                agreed_at="2026-09-25T00:00:00Z",
            )
            mod.set_baseline(bundle, args)
            for check in [
                "configReviewed",
                "connectorScopesVerified",
                "baselineAgreed",
                "costPolicyAccepted",
                "rollbackReviewed",
            ]:
                mod.set_check(bundle, check)
            result = mod.diagnose(bundle, "CLIENT_CONFIGURED")
            self.assertTrue(result["ready"], result["blockers"])
            installation = mod.promote(bundle, "CLIENT_CONFIGURED", "2026-09-25T01:00:00Z")
            self.assertEqual(installation["state"], "CLIENT_CONFIGURED")
            self.assertEqual(mod.assert_safe_tree(mod.read_json(bundle / "connector-bindings.json")), [])

    def test_client_accepted_requires_extra_acceptance_checks(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "LEAD_INTAKE_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            mod.set_binding(
                bundle,
                "records.leads.write",
                "google_sheets",
                "credref:crm-demo",
                ["spreadsheets"],
                {"spreadsheetId": "sheet-demo", "range": "Leads!A:Z"},
            )
            mod.record_connector_verification(
                bundle,
                "records.leads.write",
                "evidence/sheets-check.json",
                "google_sheets",
                "2026-09-25T00:30:00Z",
            )
            args = argparse.Namespace(
                manual_minutes=3.0,
                sample_size=25,
                method="mixed",
                hourly_cost=20.0,
                currency="PEN",
                confidence="medium",
                agreed_at="2026-09-25T00:00:00Z",
            )
            mod.set_baseline(bundle, args)
            for check in [
                "configReviewed",
                "connectorScopesVerified",
                "baselineAgreed",
                "costPolicyAccepted",
                "rollbackReviewed",
            ]:
                mod.set_check(bundle, check)
            mod.promote(bundle, "CLIENT_CONFIGURED", "2026-09-25T01:00:00Z")
            blocked = mod.diagnose(bundle, "CLIENT_ACCEPTED")
            self.assertFalse(blocked["ready"])

            installation_doc = mod.read_json(bundle / "installation.json")
            fixture_evidence = Path(tmp) / "fixture-evidence.json"
            fixture_evidence.write_text(json.dumps({
                "schemaVersion": 1,
                "evidenceType": "LOCAL_SIMULATION",
                "productionEvidence": False,
                "tenantId": installation_doc["tenantId"],
                "installationId": installation_doc["installationId"],
                "workflowKey": installation_doc["workflowKey"],
                "workflowVersion": installation_doc["workflowVersion"],
                "workflowResult": {"status": "completed"},
                "controlPlane": {"incidents": []},
            }), encoding="utf-8")
            live_evidence = Path(tmp) / "live-evidence.json"
            live_evidence.write_text(json.dumps({
                "schemaVersion": 1,
                "evidenceType": "LIVE_PROVIDER_EXECUTION",
                "productionConnectorExecution": True,
                "requiresHumanReviewForAcceptance": True,
                "success": True,
                "tenantId": installation_doc["tenantId"],
                "installationId": installation_doc["installationId"],
                "workflowKey": installation_doc["workflowKey"],
                "workflowVersion": installation_doc["workflowVersion"],
                "controlPlane": {"incidents": []},
            }), encoding="utf-8")

            mod.record_acceptance_evidence(
                bundle,
                "clientFixturePassed",
                actor="operator@example.test",
                evidence_file=fixture_evidence,
                recorded_at="2026-09-25T01:10:00Z",
            )
            mod.record_acceptance_evidence(
                bundle,
                "productionDryRunPassed",
                actor="operator@example.test",
                evidence_file=live_evidence,
                recorded_at="2026-09-25T01:20:00Z",
            )
            mod.record_acceptance_evidence(
                bundle,
                "clientApprovalRecorded",
                actor="client@example.test",
                reference="email:approval-001",
                recorded_at="2026-09-25T01:30:00Z",
            )

            ready = mod.diagnose(bundle, "CLIENT_ACCEPTED")
            self.assertTrue(ready["ready"], ready["blockers"])
            installation = mod.promote(bundle, "CLIENT_ACCEPTED", "2026-09-25T02:00:00Z")
            self.assertEqual(installation["state"], "CLIENT_ACCEPTED")

    def test_protected_acceptance_check_cannot_be_flipped_directly(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "LEAD_INTAKE_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            with self.assertRaisesRegex(ValueError, "evidence-protected"):
                mod.set_check(bundle, "productionDryRunPassed")

    def test_acceptance_evidence_tamper_is_detected(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "LEAD_INTAKE_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            installation = mod.read_json(bundle / "installation.json")
            source = Path(tmp) / "fixture.json"
            source.write_text(json.dumps({
                "evidenceType": "LOCAL_SIMULATION",
                "productionEvidence": False,
                "tenantId": installation["tenantId"],
                "installationId": installation["installationId"],
                "workflowKey": installation["workflowKey"],
                "workflowVersion": installation["workflowVersion"],
                "controlPlane": {"incidents": []},
            }), encoding="utf-8")
            entry = mod.record_acceptance_evidence(
                bundle,
                "clientFixturePassed",
                actor="operator@example.test",
                evidence_file=source,
                recorded_at="2026-09-25T01:00:00Z",
            )
            snapshot = bundle / entry["snapshot"]
            snapshot.write_text('{"tampered":true}\n', encoding="utf-8")
            acceptance = mod.read_json(bundle / "acceptance.json")
            errors = mod.validate_acceptance_evidence(bundle, acceptance)
            self.assertTrue(any("hash mismatch" in error for error in errors))

    def test_bound_connector_is_not_verified_without_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "PAYMENT_REMINDER_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            mod.set_binding(
                bundle,
                "records.accounts_receivable.read",
                "google_sheets",
                "credref:sheet-demo",
                ["spreadsheets.readonly"],
                {"spreadsheetId": "sheet-demo", "range": "Invoices!A:Z"},
            )
            connectors = mod.read_json(bundle / "connector-bindings.json")
            bound = next(x for x in connectors["bindings"] if x["capability"] == "records.accounts_receivable.read")
            self.assertEqual(bound["status"], "bound")
            self.assertIsNone(bound["verification"])
            result = mod.diagnose(bundle, "CLIENT_CONFIGURED")
            self.assertTrue(any("connector not verified" in x for x in result["blockers"]))

    def test_unknown_provider_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "PAYMENT_REMINDER_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            with self.assertRaisesRegex(ValueError, "provider not in approved connector catalog"):
                mod.set_binding(
                    bundle,
                    "messaging.send",
                    "unknown_provider",
                    "credref:test",
                    [],
                    {},
                )

    def test_google_sheets_requires_non_secret_location_settings(self):
        with tempfile.TemporaryDirectory() as tmp:
            bundle = mod.scaffold(
                "PAYMENT_REMINDER_AUTOMATION",
                "tenant-demo",
                Path(tmp),
                "2026-09-25T00:00:00Z",
            )
            with self.assertRaisesRegex(ValueError, "google_sheets setting required"):
                mod.set_binding(
                    bundle,
                    "records.accounts_receivable.read",
                    "google_sheets",
                    "credref:test",
                    ["spreadsheets.readonly"],
                    {},
                )

    def test_embedded_secret_like_field_is_rejected(self):
        errors = mod.assert_safe_tree({"apiKey": "super-secret-live-value"})
        self.assertTrue(errors)


if __name__ == "__main__":
    unittest.main()
