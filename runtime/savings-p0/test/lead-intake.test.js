import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { ingestLead, normalizeInboundLead } from "../src/workflows/lead-intake.js";

function fixture() {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("li") });
  return {
    controlPlane,
    runtime: new SavingsRuntime({
      controlPlane,
      idempotencyStore: new MemoryIdempotencyStore(),
      clock: () => new Date("2026-09-24T12:00:00Z"),
    }),
  };
}

test("lead intake normalizes and persists one lead", async () => {
  const { runtime, controlPlane } = fixture();
  const leads = new MemoryTableAdapter();
  const result = await ingestLead({
    runtime, leadSource: leads, tenantId: "t", automationInstanceId: "lead-intake",
    inbound: {
      sourceSystem: "web-form", sourceId: "42", name: "  Ana   Pérez ",
      email: " ANA@EXAMPLE.TEST ", phone: " +51 999-111-222 ", company: " ACME ",
      receivedAt: "2026-09-24T11:00:00Z",
    },
  });
  assert.equal(result.status, "completed");
  const stored = await leads.list({ tenantId: "t" });
  assert.equal(stored.length, 1);
  assert.equal(stored[0].name, "Ana Pérez");
  assert.equal(stored[0].email, "ana@example.test");
  assert.equal(stored[0].phone, "+51999111222");
  assert.equal(controlPlane.savingsEvents[0].automatedUnits, 1);
});

test("lead intake duplicate source event does not double count", async () => {
  const { runtime, controlPlane } = fixture();
  const leads = new MemoryTableAdapter();
  const args = {
    runtime, leadSource: leads, tenantId: "t", automationInstanceId: "lead-intake",
    inbound: { sourceSystem: "form", sourceId: "same", email: "x@example.test" },
  };
  await ingestLead(args);
  const second = await ingestLead(args);
  assert.equal(second.status, "skipped_duplicate");
  assert.equal((await leads.list({ tenantId: "t" })).length, 1);
  assert.equal(controlPlane.savingsEvents.length, 1);
});

test("lead intake requires usable identity", () => {
  assert.throws(() => normalizeInboundLead({ sourceSystem: "x", sourceId: "1" }));
});
