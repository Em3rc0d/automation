import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../../src/adapters/memory-message.js";
import { runPaymentReminderBatch } from "../../src/workflows/payment-reminder.js";
import { calculateSavings } from "../../src/savings.js";

const here = dirname(fileURLToPath(import.meta.url));
const invoices = JSON.parse(await readFile(join(here, "fixtures", "invoices.json"), "utf8"));
const clock = () => new Date("2026-09-24T14:00:00Z");
const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("demo") });
const idempotencyStore = new MemoryIdempotencyStore();
const runtime = new SavingsRuntime({ controlPlane, idempotencyStore, clock });
const invoiceSource = new MemoryTableAdapter(invoices);
const messageAdapter = new MemoryMessageAdapter({ costPerMessagePen: 0.02 });

const batch = await runPaymentReminderBatch({
  runtime,
  invoiceSource,
  messageAdapter,
  tenantId: "tenant-demo",
  automationInstanceId: "payment-reminder-demo",
  asOfDate: "2026-09-24",
  config: {
    reminderOffsetsDays: [-3, 0, 7, 15],
    missingContactExceptionMinutes: 2,
    defaultChannel: "email",
    templateKey: "payment-reminder-v1",
  },
});

const savings = calculateSavings({
  baseline: {
    manualMinutesPerUnit: 4,
    loadedHourlyCost: 18,
    currency: "PEN",
    confidence: "medium",
  },
  events: controlPlane.savingsEvents,
});

const output = {
  batch: {
    scanned: batch.scanned,
    eligible: batch.eligible,
    executionStatuses: batch.executions.map(({ invoiceId, offsetDays, status, duplicate }) => ({ invoiceId, offsetDays, status, duplicate })),
  },
  sentMessages: messageAdapter.sent.map(({ providerMessageId, to, templateKey, variables }) => ({ providerMessageId, to, templateKey, variables })),
  savings,
  controlPlane: {
    runs: controlPlane.executionRuns.length,
    events: controlPlane.executionEvents.length,
    processRecords: controlPlane.processRecords.length,
    savingsEvents: controlPlane.savingsEvents.length,
    incidents: controlPlane.incidents.length,
  },
};

if (process.argv.includes("--assert")) {
  assert.equal(output.batch.scanned, 5);
  assert.equal(output.batch.eligible, 3);
  assert.equal(output.sentMessages.length, 2);
  assert.equal(output.controlPlane.processRecords, 3);
  assert.equal(output.controlPlane.savingsEvents, 3);
  assert.equal(output.controlPlane.incidents, 0);
  assert.equal(output.savings.automatedUnits, 2);
  assert.equal(output.savings.exceptionMinutes, 2);
  assert.equal(output.savings.netMinutesReleased, 6);
  assert.ok(Math.abs(output.savings.netOperatingValue - 1.76) < 1e-9);
}

console.log(JSON.stringify(output, null, 2));
