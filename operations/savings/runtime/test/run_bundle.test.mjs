import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBundle, SUPPORTED } from "../run_bundle.mjs";

async function makeBundle({ workflowKey, config = {}, baseline = {} }) {
  const root = await mkdtemp(join(tmpdir(), "savings-runner-"));
  const bundle = join(root, "bundle");
  await mkdir(bundle);
  await writeFile(join(bundle, "installation.json"), JSON.stringify({
    schemaVersion: 1,
    installationId: "inst_test",
    tenantId: "tenant-test",
    workflowKey,
    workflowVersion: "0.1",
    runtimeProfile: "zero-deps-node-v1",
    state: "DRAFT"
  }));
  await writeFile(join(bundle, "config.json"), JSON.stringify(config));
  await writeFile(join(bundle, "savings-baseline.json"), JSON.stringify({
    schemaVersion: 1,
    workflowKey,
    unit: "unit",
    status: baseline.status ?? "DRAFT",
    manual_minutes_per_unit: baseline.manual_minutes_per_unit ?? null,
    loaded_hourly_cost: baseline.loaded_hourly_cost ?? null,
    currency: "PEN",
    confidence: baseline.confidence ?? null
  }));
  return { root, bundle };
}

async function fixture(root, value) {
  const path = join(root, "fixture.json");
  await writeFile(path, JSON.stringify(value));
  return path;
}

test("runner exposes all 12 approved P0 workflows", () => {
  assert.equal(SUPPORTED.length, 12);
  assert.equal(new Set(SUPPORTED).size, 12);
  assert.ok(SUPPORTED.includes("PAYMENT_REMINDER_AUTOMATION"));
  assert.ok(SUPPORTED.includes("DOCUMENT_ARCHIVE_AUTOMATION"));
});

test("payment reminder local simulation uses bundle baseline without production claim", async () => {
  const { root, bundle } = await makeBundle({
    workflowKey: "PAYMENT_REMINDER_AUTOMATION",
    config: { reminderOffsetsDays: [0], defaultChannel: "email", templateKey: "payment-reminder-v1" },
    baseline: { status: "AGREED", manual_minutes_per_unit: 4, loaded_hourly_cost: 18, confidence: "medium" }
  });
  const input = await fixture(root, {
    asOfDate: "2026-09-25",
    records: [{
      id: "inv-1",
      invoiceNumber: "F001",
      customerName: "Fixture",
      status: "open",
      dueDate: "2026-09-25",
      amount: 100,
      currency: "PEN",
      contact: { channel: "email", address: "fixture@example.test" }
    }]
  });
  const result = await runBundle({ bundle, fixturePath: input });
  assert.equal(result.evidenceType, "LOCAL_SIMULATION");
  assert.equal(result.productionEvidence, false);
  assert.equal(result.sideEffects.simulatedMessages.length, 1);
  assert.equal(result.controlPlane.savingsEvents.length, 1);
  assert.equal(result.savings.automatedUnits, 1);
  assert.equal(result.savings.netMinutesReleased, 4);
});

test("lead intake local simulation persists normalized lead without cloud connector", async () => {
  const { root, bundle } = await makeBundle({ workflowKey: "LEAD_INTAKE_AUTOMATION" });
  const input = await fixture(root, {
    clock: "2026-09-25T12:00:00Z",
    inbound: {
      sourceSystem: "web_form",
      externalId: "form-001",
      name: "Cliente Fixture",
      email: "fixture@example.test",
      phone: "+51999999999",
      source: "website"
    }
  });
  const result = await runBundle({ bundle, fixturePath: input });
  assert.equal(result.workflowResult.status, "completed");
  assert.equal(result.sideEffects.tableRows.length, 1);
  assert.equal(result.sideEffects.tableRows[0].tenantId, "tenant-test");
  assert.equal(result.savings, null);
});

test("appointment reminder simulation injects tenant into calendar fixture", async () => {
  const { root, bundle } = await makeBundle({
    workflowKey: "APPOINTMENT_REMINDER_AUTOMATION",
    config: { reminderOffsetsMinutes: [120], scanWindowMinutes: 30 }
  });
  const input = await fixture(root, {
    asOf: "2026-09-25T12:00:00Z",
    events: [{
      id: "appt-1",
      title: "Fixture appointment",
      status: "scheduled",
      startsAt: "2026-09-25T14:00:00Z",
      attendees: [{ id: "c1", name: "Client", contact: { channel: "email", address: "client@example.test" } }]
    }]
  });
  const result = await runBundle({ bundle, fixturePath: input });
  assert.equal(result.sideEffects.simulatedMessages.length, 1);
  assert.equal(result.sideEffects.calendarEvents[0].tenantId, "tenant-test");
  assert.equal(result.controlPlane.incidents.length, 0);
});
