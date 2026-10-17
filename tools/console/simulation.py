#!/usr/bin/env python3
"""Execute only APPROVED_BASELINE workflows using in-memory adapters + synthetic fixtures.

Local demonstrations NEVER verify client providers, certify production or contact
real customers. The same canonical run_bundle.mjs implements the workflow logic.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNNER = ROOT / "operations" / "savings" / "runtime" / "run_bundle.mjs"
CLOCK = "2026-09-24T12:00:00Z"
DATE = "2026-09-24"
FAKE_CONTACT = {"channel": "email", "address": "demo@example.test"}

# Intentional synthetic fixtures: never import client data, secrets, or provider events.
FIXTURES: dict[str, dict] = {
    "PAYMENT_REMINDER_AUTOMATION": {
        "records": [{"id": "demo-invoice-1", "invoiceNumber": "F-D-001",
                     "customerName": "Cliente ficticio", "status": "open",
                     "dueDate": DATE, "amount": 100, "currency": "PEN",
                     "contact": FAKE_CONTACT}]},
    "LEAD_INTAKE_AUTOMATION": {
        "inbound": {"sourceSystem": "web-form", "sourceId": "synthetic-lead-001",
                    "name": "Lead de prueba", "email": "demo@example.test",
                    "company": "Empresa Demo"}},
    "LEAD_FOLLOWUP_AUTOMATION": {
        "records": [{"id": "demo-lead-1", "status": "open", "name": "Lead de prueba",
                     "createdAt": "2026-09-22T10:00:00Z", "contact": FAKE_CONTACT}]},
    "UNANSWERED_MESSAGE_WATCHDOG_AUTOMATION": {
        "records": [{"id": "demo-thread-1", "lastInboundAt": "2026-09-24T06:00:00Z",
                     "owner": {"contact": FAKE_CONTACT}}]},
    "APPOINTMENT_REMINDER_AUTOMATION": {
        "events": [{"id": "demo-appt-1", "title": "Reunión de prueba",
                    "startsAt": "2026-09-25T12:00:00Z", "status": "confirmed",
                    "attendees": [{"id": "demo-customer-1", "name": "Cliente ficticio",
                                   "contact": FAKE_CONTACT}]}]},
    "QUOTE_FOLLOWUP_AUTOMATION": {
        "records": [{"id": "demo-quote-1", "status": "pending",
                     "deliveredAt": "2026-09-20T12:00:00Z", "contact": FAKE_CONTACT}]},
    "EMAIL_CLASSIFY_ROUTE_AUTOMATION": {
        "email": {"id": "demo-mail-1", "subject": "Consulta de prueba",
                  "body": "Buenas tardes", "from": {"address": "demo@example.test"}}},
    "EMAIL_ATTACHMENT_EXTRACT_AUTOMATION": {
        "email": {"id": "demo-mail-2", "attachments": [
            {"id": "attachment-1", "name": "demo.pdf", "mimeType": "application/pdf",
             "sizeBytes": 3, "content": "pdf"}]}},
    "DOCUMENT_ARCHIVE_AUTOMATION": {
        "document": {"id": "demo-document-1", "documentDate": DATE,
                     "documentType": "invoice", "name": "demo.pdf", "content": "pdf"}},
    "LOW_STOCK_ALERT_AUTOMATION": {
        "records": [{"id": "demo-sku-1", "sku": "DEMO-01", "onHand": 2,
                     "reorderPoint": 5, "alertContact": FAKE_CONTACT}]},
    "SUPPORT_INTAKE_AUTOMATION": {
        "request": {"sourceSystem": "web-form", "sourceId": "demo-ticket-1",
                    "message": "Solicitud ficticia", "channel": "email"}},
    "RENEWAL_REMINDER_AUTOMATION": {
        "records": [{"id": "demo-contract-1", "status": "active",
                     "renewalDate": "2026-10-24", "contact": FAKE_CONTACT}]},
}


def simulate(bundle: Path) -> dict:
    """Run canonical approved code with in-memory adapters; no external side effects."""
    bundle = Path(bundle).resolve()
    installation = json.loads((bundle / "installation.json").read_text(encoding="utf-8"))
    key = installation["workflowKey"]
    tenant = installation["tenantId"]
    if key not in FIXTURES or installation.get("runtimeProfile") != "zero-deps-node-v1":
        raise ValueError("Only certified zero-deps approved baselines can be simulated")
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node.js 20+ is required for a local workflow simulation")
    fixture = {**FIXTURES[key], "clock": CLOCK, "asOf": CLOCK,
               "asOfDate": DATE, "simulationCostPerMessagePen": 0}
    # Launch a fixed executable/script with a static fixture; never accept user paths.
    with tempfile.TemporaryDirectory(prefix="automation-simulation-") as tempdir:
        fixture_path = Path(tempdir) / "synthetic-fixture.json"
        fixture_path.write_text(json.dumps(fixture), encoding="utf-8")
        try:
            proc = subprocess.run(
                [node, str(RUNNER), "--bundle", str(bundle), "--fixture", str(fixture_path)],
                cwd=ROOT, capture_output=True, text=True, timeout=20, check=False,
                env={"PATH": os.environ.get("PATH", ""), "NODE_ENV": "test"},
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("Local simulation exceeded 20 seconds") from exc
    if proc.returncode != 0:
        raise RuntimeError("Local simulation failed; see operator CI/runbook (no provider was contacted)")
    if len(proc.stdout) > 1_000_000:
        raise RuntimeError("Local simulation output limit exceeded")
    result = json.loads(proc.stdout)
    if (result.get("evidenceType") != "LOCAL_SIMULATION"
            or result.get("productionEvidence") is not False
            or result.get("tenantId") != tenant
            or result.get("workflowKey") != key):
        raise RuntimeError("Simulator evidence identity/scope mismatch")
    control = result.get("controlPlane", {})
    runs = len(control.get("executionRuns", []))
    incidents = len(control.get("incidents", []))
    processes = len(control.get("processRecords", []))
    effects = result.get("sideEffects", {})
    simulated_messages = len(effects.get("simulatedMessages", []))
    stored_objects = len(effects.get("simulatedStorageObjects", []))
    tickets = len(effects.get("ticketRows", []))
    # Completed means the executable runtime demonstrated meaningful synthetic work.
    passed = incidents == 0 and (processes > 0 or simulated_messages > 0
                                 or stored_objects > 0 or tickets > 0)
    return {
        "schemaVersion": 1,
        "tenantId": tenant, "workflowKey": key,
        "evidenceType": "LOCAL_SIMULATION",
        "productionEvidence": False,
        "testedWithSyntheticData": True,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "status": "SIMULATION_PASS" if passed else "SIMULATION_REVIEW",
        "executionRuns": runs, "processRecords": processes,
        "incidents": incidents, "simulatedMessages": simulated_messages,
        "simulatedStorageObjects": stored_objects, "simulatedTickets": tickets,
        "runnerOutputSha256": hashlib.sha256(proc.stdout.encode("utf-8")).hexdigest(),
        "notice": "Solo validación local con adaptadores en memoria; no funcionamiento real en AV Perú."
    }


def write_evidence(path: Path, summary: dict) -> None:
    """Persist only PII-free summary of a synthetic run in the ignored .local tree."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink():
        raise ValueError("Refusing to overwrite symlinked simulation evidence")
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".simulation-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(summary, handle, indent=2, ensure_ascii=False)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(tmp, 0o600)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
