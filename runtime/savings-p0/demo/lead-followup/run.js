import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../../src/adapters/memory-message.js";
import { runLeadFollowupBatch } from "../../src/workflows/lead-followup.js";
import { calculateSavings } from "../../src/savings.js";

const here = dirname(fileURLToPath(import.meta.url));
const leadsFixture = JSON.parse(await readFile(join(here, "fixtures", "leads.json"), "utf8"));
const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("lead-demo") });
const runtime = new SavingsRuntime({
  controlPlane,
  idempotencyStore: new MemoryIdempotencyStore(),
  clock: () => new Date("2026-09-24T12:00:00Z"),
});
const leads = new MemoryTableAdapter(leadsFixture);
const messages = new MemoryMessageAdapter({ costPerMessagePen: 0.02 });

const batch = await runLeadFollowupBatch({
  runtime,
  leadSource: leads,
  messageAdapter: messages,
  tenantId: "tenant-demo",
  automationInstanceId: "lead-followup-demo",
  asOf: "2026-09-24T12:00:00Z",
  config: {
    stages: [
      { key: "h24", delayHours: 24, templateKey: "lead-followup-24h-v1" },
      { key: "h72", delayHours: 72, templateKey: "lead-followup-72h-v1" }
    ],
    minSpacingHours: 12,
    missingContactExceptionMinutes: 3
  }
});

const savings = calculateSavings({
  baseline: {
    manualMinutesPerUnit: 3,
    loadedHourlyCost: 18,
    currency: "PEN",
    confidence: "medium"
  },
  events: controlPlane.savingsEvents,
});
const storedLeads = await leads.list({ tenantId: "tenant-demo" });

const output = {
  batch: {
    scannedLeads: batch.scannedLeads,
    eligible: batch.eligible,
    statuses: batch.executions.map(({ leadId, stage, status }) => ({ leadId, stage, status })),
  },
  sentMessages: messages.sent.length,
  persistedStages: Object.fromEntries(
    storedLeads.map((lead) => [lead.id, lead.followup?.completedStages ?? []]),
  ),
  savings,
  controlPlane: {
    processRecords: controlPlane.processRecords.length,
    savingsEvents: controlPlane.savingsEvents.length,
    incidents: controlPlane.incidents.length,
  },
};

if (process.argv.includes("--assert")) {
  assert.equal(output.batch.scannedLeads, 4);
  assert.equal(output.batch.eligible, 2);
  assert.equal(output.sentMessages, 1);
  assert.deepEqual(output.persistedStages["lead-001"], ["h24"]);
  assert.equal(output.controlPlane.processRecords, 2);
  assert.equal(output.controlPlane.savingsEvents, 2);
  assert.equal(output.savings.automatedUnits, 1);
  assert.equal(output.savings.exceptionMinutes, 3);
  assert.equal(output.savings.netMinutesReleased, 0);
  assert.ok(Math.abs(output.savings.netOperatingValue + 0.02) < 1e-9);
}

console.log(JSON.stringify(output, null, 2));
