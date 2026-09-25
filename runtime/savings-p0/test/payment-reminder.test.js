import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";
import { dueOffsetDays, evaluatePaymentReminder, runPaymentReminderBatch } from "../src/workflows/payment-reminder.js";
import { calculateSavings } from "../src/savings.js";

function makeRuntime() {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("p") });
  return {
    controlPlane,
    runtime: new SavingsRuntime({
      controlPlane,
      idempotencyStore: new MemoryIdempotencyStore(),
      clock: () => new Date("2026-09-24T14:00:00Z"),
    }),
  };
}

const baseInvoices = [
  { id: "due", tenantId: "t", invoiceNumber: "F1", customerName: "Due", status: "open", dueDate: "2026-09-24", amount: 100, currency: "PEN", contact: { channel: "email", address: "due@example.test" } },
  { id: "overdue", tenantId: "t", invoiceNumber: "F2", customerName: "Overdue", status: "open", dueDate: "2026-09-17", amount: 200, currency: "PEN", contact: { channel: "email", address: "late@example.test" } },
  { id: "paid", tenantId: "t", invoiceNumber: "F3", customerName: "Paid", status: "paid", dueDate: "2026-09-24", amount: 300, currency: "PEN", contact: { channel: "email", address: "paid@example.test" } },
  { id: "missing", tenantId: "t", invoiceNumber: "F4", customerName: "Missing", status: "open", dueDate: "2026-09-24", amount: 400, currency: "PEN", contact: { channel: "email", address: "" } },
];

test("due offset is deterministic on calendar days", () => {
  assert.equal(dueOffsetDays({ dueDate: "2026-09-27", asOfDate: "2026-09-24" }), -3);
  assert.equal(dueOffsetDays({ dueDate: "2026-09-24", asOfDate: "2026-09-24" }), 0);
  assert.equal(dueOffsetDays({ dueDate: "2026-09-17", asOfDate: "2026-09-24" }), 7);
});

test("paid invoice is never eligible", () => {
  const decision = evaluatePaymentReminder(baseInvoices[2], { asOfDate: "2026-09-24", reminderOffsetsDays: [0, 7] });
  assert.equal(decision.eligible, false);
  assert.equal(decision.reason, "invoice_closed");
});

test("batch sends eligible reminders, routes missing contact and measures savings", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const table = new MemoryTableAdapter(baseInvoices);
  const messages = new MemoryMessageAdapter({ costPerMessagePen: 0.02 });
  const batch = await runPaymentReminderBatch({
    runtime,
    invoiceSource: table,
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "payment-reminder",
    asOfDate: "2026-09-24",
    config: { reminderOffsetsDays: [0, 7], missingContactExceptionMinutes: 2 },
  });
  assert.equal(batch.scanned, 4);
  assert.equal(batch.eligible, 3);
  assert.equal(messages.sent.length, 2);
  assert.equal(controlPlane.processRecords.length, 3);
  assert.equal(controlPlane.savingsEvents.length, 3);
  assert.equal(controlPlane.processRecords.find((x) => x.entityId === "missing").requiresAttention, true);
  const savings = calculateSavings({
    baseline: { manualMinutesPerUnit: 4, loadedHourlyCost: 18, currency: "PEN", confidence: "medium" },
    events: controlPlane.savingsEvents,
  });
  assert.equal(savings.automatedUnits, 2);
  assert.equal(savings.exceptionMinutes, 2);
  assert.equal(savings.netMinutesReleased, 6);
  assert.ok(Math.abs(savings.netOperatingValue - 1.76) < 1e-9);
});

test("rerunning same reminder stage does not resend or double count savings", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const table = new MemoryTableAdapter([baseInvoices[0]]);
  const messages = new MemoryMessageAdapter();
  const args = {
    runtime,
    invoiceSource: table,
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "payment-reminder",
    asOfDate: "2026-09-24",
    config: { reminderOffsetsDays: [0] },
  };
  const first = await runPaymentReminderBatch(args);
  const second = await runPaymentReminderBatch(args);
  assert.equal(first.executions[0].status, "completed");
  assert.equal(second.executions[0].status, "skipped_duplicate");
  assert.equal(messages.sent.length, 1);
  assert.equal(controlPlane.savingsEvents.length, 1);
});

test("transient provider failure retries and still sends once", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const invoice = baseInvoices[0];
  const key = `t:payment-reminder:${invoice.id}:offset:0`;
  const messages = new MemoryMessageAdapter({ transientFailures: { [key]: 1 } });
  const batch = await runPaymentReminderBatch({
    runtime,
    invoiceSource: new MemoryTableAdapter([invoice]),
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "payment-reminder",
    asOfDate: "2026-09-24",
    config: { reminderOffsetsDays: [0] },
  });
  assert.equal(batch.executions[0].status, "completed");
  assert.equal(messages.attempts.get(key), 2);
  assert.equal(messages.sent.length, 1);
  assert.equal(controlPlane.incidents.length, 0);
  assert.equal(controlPlane.savingsEvents.length, 1);
});
