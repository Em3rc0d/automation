import assert from "node:assert/strict";

const modules = [
  ["payment-reminder", "runPaymentReminderBatch"],
  ["appointment-reminder", "runAppointmentReminderBatch"],
  ["lead-followup", "runLeadFollowupBatch"],
  ["lead-intake", "ingestLead"],
  ["unanswered-message-watchdog", "runUnansweredMessageWatchdog"],
  ["quote-followup", "runQuoteFollowupBatch"],
  ["email-classify-route", "classifyAndRouteEmail"],
  ["email-attachment-extract", "extractEmailAttachments"],
  ["document-archive", "archiveDocument"],
  ["low-stock-alert", "runLowStockAlert"],
  ["support-intake", "intakeSupportRequest"],
  ["renewal-reminder", "runRenewalReminderBatch"],
];

for (const [slug, exported] of modules) {
  const mod = await import(`../../../runtime/savings-p0/src/workflows/${slug}.js`);
  assert.equal(typeof mod[exported], "function", `${slug} missing export ${exported}`);
}

const runtime = await import("../../../runtime/savings-p0/src/runtime.js");
const stores = await import("../../../runtime/savings-p0/src/stores.js");
const table = await import("../../../runtime/savings-p0/src/adapters/memory-table.js");
const message = await import("../../../runtime/savings-p0/src/adapters/memory-message.js");
const calendar = await import("../../../runtime/savings-p0/src/adapters/memory-calendar.js");
const storage = await import("../../../runtime/savings-p0/src/adapters/memory-storage.js");

for (const [name, value] of [
  ["SavingsRuntime", runtime.SavingsRuntime],
  ["MemoryControlPlane", stores.MemoryControlPlane],
  ["MemoryIdempotencyStore", stores.MemoryIdempotencyStore],
  ["MemoryTableAdapter", table.MemoryTableAdapter],
  ["MemoryMessageAdapter", message.MemoryMessageAdapter],
  ["MemoryCalendarAdapter", calendar.MemoryCalendarAdapter],
  ["MemoryStorageAdapter", storage.MemoryStorageAdapter],
]) {
  assert.equal(typeof value, "function", `missing runtime primitive ${name}`);
}

console.log("ZERO-DEPS NODE RUNTIME SMOKE: PASS");
console.log("workflow_modules=12 adapters=4 runtime_primitives=3");
