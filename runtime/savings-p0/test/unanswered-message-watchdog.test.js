import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";
import { evaluateUnansweredThread, runUnansweredMessageWatchdog } from "../src/workflows/unanswered-message-watchdog.js";

function fixture() {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("uw") });
  return {
    controlPlane,
    runtime: new SavingsRuntime({
      controlPlane,
      idempotencyStore: new MemoryIdempotencyStore(),
      clock: () => new Date("2026-09-24T12:00:00Z"),
    }),
  };
}

test("watchdog distinguishes answered and SLA-breached threads", () => {
  assert.equal(evaluateUnansweredThread({
    id: "a", lastInboundAt: "2026-09-24T06:00:00Z", lastOutboundAt: null,
  }, { asOf: "2026-09-24T12:00:00Z", slaHours: 4 }).eligible, true);
  assert.equal(evaluateUnansweredThread({
    id: "b", lastInboundAt: "2026-09-24T06:00:00Z", lastOutboundAt: "2026-09-24T07:00:00Z",
  }, { asOf: "2026-09-24T12:00:00Z", slaHours: 4 }).reason, "already_answered");
});

test("watchdog alerts owner, routes missing owner and is duplicate-safe", async () => {
  const { runtime, controlPlane } = fixture();
  const threads = new MemoryTableAdapter([
    { id: "x", tenantId: "t", subject: "Need answer", status: "open", lastInboundAt: "2026-09-24T06:00:00Z",
      owner: { contact: { channel: "email", address: "owner@example.test" } } },
    { id: "missing", tenantId: "t", subject: "No owner", status: "open", lastInboundAt: "2026-09-24T05:00:00Z",
      owner: { contact: { channel: "email", address: "" } } },
    { id: "answered", tenantId: "t", status: "open", lastInboundAt: "2026-09-24T05:00:00Z",
      lastOutboundAt: "2026-09-24T05:30:00Z", owner: { contact: { address: "owner@example.test" } } },
  ]);
  const messages = new MemoryMessageAdapter({ costPerMessagePen: 0.01 });
  const args = { runtime, threadSource: threads, messageAdapter: messages, tenantId: "t",
    automationInstanceId: "watchdog", asOf: "2026-09-24T12:00:00Z", config: { slaHours: 4 } };
  const first = await runUnansweredMessageWatchdog(args);
  const second = await runUnansweredMessageWatchdog(args);
  assert.equal(first.eligible, 2);
  assert.equal(messages.sent.length, 1);
  assert.equal(controlPlane.savingsEvents.length, 2);
  assert.equal(second.executions.every((x)=>x.status === "skipped_duplicate"), true);
});
