import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";
import {
  evaluateLeadFollowup,
  runLeadFollowupBatch,
} from "../src/workflows/lead-followup.js";
import { calculateSavings } from "../src/savings.js";

function makeRuntime(clock = "2026-09-24T12:00:00Z") {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("l") });
  return {
    controlPlane,
    runtime: new SavingsRuntime({
      controlPlane,
      idempotencyStore: new MemoryIdempotencyStore(),
      clock: () => new Date(clock),
    }),
  };
}

const stages = [
  { key: "h24", delayHours: 24, templateKey: "lead-followup-24h-v1" },
  { key: "h72", delayHours: 72, templateKey: "lead-followup-72h-v1" },
];

test("lead follow-up selects earliest due incomplete stage", () => {
  const lead = {
    id: "lead-1",
    status: "open",
    createdAt: "2026-09-20T12:00:00Z",
    followup: { completedStages: ["h24"], lastFollowupAt: "2026-09-22T12:00:00Z" },
  };
  const decision = evaluateLeadFollowup(lead, {
    asOf: "2026-09-24T12:00:00Z",
    stages,
    minSpacingHours: 12,
  });
  assert.equal(decision.eligible, true);
  assert.equal(decision.stage.key, "h72");
});

test("lead follow-up respects closed/do-not-contact and minimum spacing", () => {
  const closed = evaluateLeadFollowup(
    { id: "closed", status: "won", createdAt: "2026-09-20T12:00:00Z" },
    { asOf: "2026-09-24T12:00:00Z", stages, minSpacingHours: 12 },
  );
  assert.equal(closed.eligible, false);

  const spaced = evaluateLeadFollowup(
    {
      id: "spaced",
      status: "open",
      createdAt: "2026-09-20T12:00:00Z",
      followup: { completedStages: ["h24"], lastFollowupAt: "2026-09-24T08:00:00Z" },
    },
    { asOf: "2026-09-24T12:00:00Z", stages, minSpacingHours: 12 },
  );
  assert.equal(spaced.eligible, false);
  assert.equal(spaced.reason, "minimum_spacing");
});

test("batch sends follow-up, persists stage and accounts missing contact", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const leads = new MemoryTableAdapter([
    {
      id: "send",
      tenantId: "t",
      name: "Send Lead",
      status: "open",
      createdAt: "2026-09-22T10:00:00Z",
      contact: { channel: "email", address: "lead@example.test" },
    },
    {
      id: "missing",
      tenantId: "t",
      name: "Missing Lead",
      status: "open",
      createdAt: "2026-09-22T10:00:00Z",
      contact: { channel: "email", address: "" },
    },
    {
      id: "won",
      tenantId: "t",
      name: "Won Lead",
      status: "won",
      createdAt: "2026-09-20T10:00:00Z",
      contact: { channel: "email", address: "won@example.test" },
    },
  ]);
  const messages = new MemoryMessageAdapter({ costPerMessagePen: 0.02 });
  const batch = await runLeadFollowupBatch({
    runtime,
    leadSource: leads,
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "lead-followup",
    asOf: "2026-09-24T12:00:00Z",
    config: { stages, minSpacingHours: 12, missingContactExceptionMinutes: 3 },
  });

  assert.equal(batch.scannedLeads, 3);
  assert.equal(batch.eligible, 2);
  assert.equal(messages.sent.length, 1);
  assert.equal(controlPlane.processRecords.length, 2);
  assert.equal(controlPlane.savingsEvents.length, 2);
  const updated = (await leads.list({ tenantId: "t" })).find((lead) => lead.id === "send");
  assert.deepEqual(updated.followup.completedStages, ["h24"]);
  assert.equal(updated.followup.lastFollowupStage, "h24");

  const savings = calculateSavings({
    baseline: { manualMinutesPerUnit: 3, loadedHourlyCost: 18, currency: "PEN", confidence: "medium" },
    events: controlPlane.savingsEvents,
  });
  assert.equal(savings.automatedUnits, 1);
  assert.equal(savings.exceptionMinutes, 3);
  assert.equal(savings.netMinutesReleased, 0);
  assert.ok(Math.abs(savings.netOperatingValue + 0.02) < 1e-9);
});

test("same scheduler moment does not immediately send the next overdue lead stage", async () => {
  const { runtime } = makeRuntime();
  const leads = new MemoryTableAdapter([
    {
      id: "old",
      tenantId: "t",
      name: "Old Lead",
      status: "open",
      createdAt: "2026-09-20T10:00:00Z",
      contact: { channel: "email", address: "old@example.test" },
    },
  ]);
  const messages = new MemoryMessageAdapter();
  const args = {
    runtime,
    leadSource: leads,
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "lead-followup",
    asOf: "2026-09-24T12:00:00Z",
    config: { stages, minSpacingHours: 12 },
  };
  const first = await runLeadFollowupBatch(args);
  const second = await runLeadFollowupBatch(args);
  assert.equal(first.executions[0].stage, "h24");
  assert.equal(second.eligible, 0);
  assert.equal(messages.sent.length, 1);
});

test("transient provider failure retries lead follow-up and persists stage once", async () => {
  const { runtime, controlPlane } = makeRuntime();
  const lead = {
    id: "retry",
    tenantId: "t",
    name: "Retry Lead",
    status: "open",
    createdAt: "2026-09-22T10:00:00Z",
    contact: { channel: "email", address: "retry@example.test" },
  };
  const key = "t:lead-followup:retry:stage:h24";
  const leads = new MemoryTableAdapter([lead]);
  const messages = new MemoryMessageAdapter({ transientFailures: { [key]: 1 } });
  const batch = await runLeadFollowupBatch({
    runtime,
    leadSource: leads,
    messageAdapter: messages,
    tenantId: "t",
    automationInstanceId: "lead-followup",
    asOf: "2026-09-24T12:00:00Z",
    config: { stages, minSpacingHours: 12 },
  });
  assert.equal(batch.executions[0].status, "completed");
  assert.equal(messages.attempts.get(key), 2);
  assert.equal(messages.sent.length, 1);
  assert.equal(controlPlane.savingsEvents.length, 1);
  const updated = (await leads.list({ tenantId: "t" })).find((x) => x.id === "retry");
  assert.deepEqual(updated.followup.completedStages, ["h24"]);
});
