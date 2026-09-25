import test from "node:test";
import assert from "node:assert/strict";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { MemoryCalendarAdapter } from "../src/adapters/memory-calendar.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";

test("table adapter isolates tenants", async () => {
  const table = new MemoryTableAdapter([
    { id: "a", tenantId: "tenant-a", value: 1 },
    { id: "b", tenantId: "tenant-b", value: 2 },
  ]);
  assert.deepEqual(await table.list({ tenantId: "tenant-a" }), [{ id: "a", tenantId: "tenant-a", value: 1 }]);
});

test("calendar adapter returns only tenant events in range", async () => {
  const calendar = new MemoryCalendarAdapter([
    { id: "a", tenantId: "tenant-a", startsAt: "2026-09-24T10:00:00Z" },
    { id: "b", tenantId: "tenant-b", startsAt: "2026-09-24T11:00:00Z" },
    { id: "c", tenantId: "tenant-a", startsAt: "2026-09-26T11:00:00Z" },
  ]);
  const events = await calendar.listUpcoming({ tenantId: "tenant-a", from: "2026-09-24T00:00:00Z", to: "2026-09-25T00:00:00Z" });
  assert.deepEqual(events.map((x) => x.id), ["a"]);
});

test("message adapter provides side-effect idempotency", async () => {
  const adapter = new MemoryMessageAdapter({ costPerMessagePen: 0.02 });
  const message = { tenantId: "t", to: "a@example.test", channel: "email", templateKey: "x", variables: {}, idempotencyKey: "msg-1" };
  const first = await adapter.send(message);
  const second = await adapter.send(message);
  assert.equal(first.duplicate, false);
  assert.equal(first.variableCostPen, 0.02);
  assert.equal(second.duplicate, true);
  assert.equal(second.variableCostPen, 0);
  assert.equal(adapter.sent.length, 1);
});
