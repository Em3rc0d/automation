import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../src/stores.js";
import { MemoryCalendarAdapter } from "../src/adapters/memory-calendar.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";
import {
  evaluateAppointmentReminder,
  runAppointmentReminderBatch,
} from "../src/workflows/appointment-reminder.js";
import { calculateSavings } from "../src/savings.js";

function makeRuntime() {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("a") });
  return {
    controlPlane,
    runtime: new SavingsRuntime({
      controlPlane,
      idempotencyStore: new MemoryIdempotencyStore(),
      clock: () => new Date("2026-09-24T12:00:00Z"),
    }),
  };
}

const events = [
  {
    id: "e24",
    tenantId: "t",
    title: "24h appointment",
    status: "scheduled",
    startsAt: "2026-09-25T12:00:00Z",
    attendees: [{ id: "c1", name: "One", contact: { channel: "email", address: "one@example.test" } }],
  },
  {
    id: "e2",
    tenantId: "t",
    title: "2h appointment",
    status: "confirmed",
    startsAt: "2026-09-24T14:00:00Z",
    attendees: [{ id: "c2", name: "Two", contact: { channel: "email", address: "two@example.test" } }],
  },
  {
    id: "missing",
    tenantId: "t",
    title: "Missing contact",
    status: "scheduled",
    startsAt: "2026-09-24T14:00:00Z",
    attendees: [{ id: "c3", name: "Three", contact: { channel: "email", address: "" } }],
  },
  {
    id: "cancelled",
    tenantId: "t",
    title: "Cancelled",
    status: "cancelled",
    startsAt: "2026-09-24T14:00:00Z",
    attendees: [{ id: "c4", name: "Four", contact: { channel: "email", address: "four@example.test" } }],
  },
  {
    id: "outside",
    tenantId: "t",
    title: "Outside",
    status: "scheduled",
    startsAt: "2026-09-24T18:00:00Z",
    attendees: [{ id: "c5", name: "Five", contact: { channel: "email", address: "five@example.test" } }],
  },
];

test("appointment reminder matches configured windows and skips cancelled appointments", () => {
  const match = evaluateAppointmentReminder(events[0], {
    asOf: "2026-09-24T12:00:00Z",
    reminderOffsetsMinutes: [1440, 120],
    scanWindowMinutes: 30,
  });
  assert.equal(match.eligible, true);
  assert.equal(match.stageMinutes, 1440);

  const cancelled = evaluateAppointmentReminder(events[3], {
    asOf: "2026-09-24T12:00:00Z",
    reminderOffsetsMinutes: [1440, 120],
    scanWindowMinutes: 30,
  });
  assert.equal(cancelled.eligible, false);
  assert.equal(cancelled.reason, "appointment_closed");
});

test("batch sends due attendee reminders and records missing-contact exception", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const messages = new MemoryMessageAdapter({ costPerMessagePen: 0.01 });
  const batch = await runAppointmentReminderBatch({
    runtime,
    calendarAdapter: new MemoryCalendarAdapter(events),
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "appointment-reminder",
    asOf: "2026-09-24T12:00:00Z",
    config: {
      reminderOffsetsMinutes: [1440, 120],
      scanWindowMinutes: 30,
      missingContactExceptionMinutes: 2,
    },
  });

  assert.equal(batch.scannedEvents, 5);
  assert.equal(batch.eligible, 3);
  assert.equal(messages.sent.length, 2);
  assert.equal(controlPlane.processRecords.length, 3);
  assert.equal(controlPlane.savingsEvents.length, 3);
  const savings = calculateSavings({
    baseline: { manualMinutesPerUnit: 2, loadedHourlyCost: 18, currency: "PEN", confidence: "medium" },
    events: controlPlane.savingsEvents,
  });
  assert.equal(savings.automatedUnits, 2);
  assert.equal(savings.exceptionMinutes, 2);
  assert.equal(savings.netMinutesReleased, 2);
  assert.ok(Math.abs(savings.netOperatingValue - 0.58) < 1e-9);
});

test("duplicate scheduler run does not resend appointment reminder or double count", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const calendarAdapter = new MemoryCalendarAdapter([events[1]]);
  const messages = new MemoryMessageAdapter();
  const args = {
    runtime,
    calendarAdapter,
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "appointment-reminder",
    asOf: "2026-09-24T12:00:00Z",
    config: { reminderOffsetsMinutes: [120], scanWindowMinutes: 30 },
  };
  await runAppointmentReminderBatch(args);
  const second = await runAppointmentReminderBatch(args);
  assert.equal(second.executions[0].status, "skipped_duplicate");
  assert.equal(messages.sent.length, 1);
  assert.equal(controlPlane.savingsEvents.length, 1);
});

test("transient message failure retries appointment reminder and sends once", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const key = "t:appointment-reminder:e2:c2:stage:120";
  const messages = new MemoryMessageAdapter({ transientFailures: { [key]: 1 } });
  const batch = await runAppointmentReminderBatch({
    runtime,
    calendarAdapter: new MemoryCalendarAdapter([events[1]]),
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "appointment-reminder",
    asOf: "2026-09-24T12:00:00Z",
    config: { reminderOffsetsMinutes: [120], scanWindowMinutes: 30 },
  });
  assert.equal(batch.executions[0].status, "completed");
  assert.equal(messages.attempts.get(key), 2);
  assert.equal(messages.sent.length, 1);
  assert.equal(controlPlane.incidents.length, 0);
});
