import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../../src/stores.js";
import { MemoryCalendarAdapter } from "../../src/adapters/memory-calendar.js";
import { MemoryMessageAdapter } from "../../src/adapters/memory-message.js";
import { runAppointmentReminderBatch } from "../../src/workflows/appointment-reminder.js";
import { calculateSavings } from "../../src/savings.js";

const here = dirname(fileURLToPath(import.meta.url));
const events = JSON.parse(await readFile(join(here, "fixtures", "events.json"), "utf8"));
const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("appt-demo") });
const runtime = new SavingsRuntime({
  controlPlane,
  idempotencyStore: new MemoryIdempotencyStore(),
  clock: () => new Date("2026-09-24T12:00:00Z"),
});
const messages = new MemoryMessageAdapter({ costPerMessagePen: 0.01 });

const batch = await runAppointmentReminderBatch({
  runtime,
  calendarAdapter: new MemoryCalendarAdapter(events),
  messageAdapter: messages,
  tenantId: "tenant-demo",
  automationInstanceId: "appointment-reminder-demo",
  asOf: "2026-09-24T12:00:00Z",
  config: {
    reminderOffsetsMinutes: [1440, 120],
    scanWindowMinutes: 30,
    missingContactExceptionMinutes: 2,
  },
});

const savings = calculateSavings({
  baseline: {
    manualMinutesPerUnit: 2,
    loadedHourlyCost: 18,
    currency: "PEN",
    confidence: "medium",
  },
  events: controlPlane.savingsEvents,
});

const output = {
  batch: {
    scannedEvents: batch.scannedEvents,
    eligible: batch.eligible,
    statuses: batch.executions.map(({ appointmentId, attendeeId, stageMinutes, status }) => ({
      appointmentId, attendeeId, stageMinutes, status,
    })),
  },
  sentMessages: messages.sent.length,
  savings,
  controlPlane: {
    processRecords: controlPlane.processRecords.length,
    savingsEvents: controlPlane.savingsEvents.length,
    incidents: controlPlane.incidents.length,
  },
};

if (process.argv.includes("--assert")) {
  assert.equal(output.batch.scannedEvents, 4);
  assert.equal(output.batch.eligible, 3);
  assert.equal(output.sentMessages, 2);
  assert.equal(output.controlPlane.processRecords, 3);
  assert.equal(output.controlPlane.savingsEvents, 3);
  assert.equal(output.savings.automatedUnits, 2);
  assert.equal(output.savings.exceptionMinutes, 2);
  assert.equal(output.savings.netMinutesReleased, 2);
  assert.ok(Math.abs(output.savings.netOperatingValue - 0.58) < 1e-9);
}

console.log(JSON.stringify(output, null, 2));
