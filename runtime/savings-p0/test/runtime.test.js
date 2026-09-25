import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../src/stores.js";
import { PermanentError } from "../src/errors.js";

function fixtureRuntime() {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("t") });
  const runtime = new SavingsRuntime({
    controlPlane,
    idempotencyStore: new MemoryIdempotencyStore(),
    clock: () => new Date("2026-09-24T12:00:00Z"),
  });
  return { runtime, controlPlane };
}

test("successful execution emits process, savings and telemetry", async () => {
  const { runtime, controlPlane } = fixtureRuntime();
  const result = await runtime.execute({
    tenantId: "tenant-a",
    automationInstanceId: "wf-1",
    workflowKey: "TEST_WORKFLOW",
    idempotencyKey: "entity-1",
    input: {},
    handler: async () => ({
      status: "completed",
      metrics: { eligibleUnits: 1, automatedUnits: 1, exceptionMinutes: 0, oversightMinutes: 0, variableCost: 0.1 },
      processRecord: {
        entityType: "test",
        entityId: "entity-1",
        source: { system: "fixture" },
        status: "done",
        occurredAt: "2026-09-24T12:00:00Z",
        updatedAt: "2026-09-24T12:00:00Z",
        summary: {},
        attributes: {},
        requiresAttention: false,
      },
    }),
  });
  assert.equal(result.status, "completed");
  assert.equal(controlPlane.executionRuns.length, 1);
  assert.equal(controlPlane.executionEvents.length, 2);
  assert.equal(controlPlane.processRecords.length, 1);
  assert.equal(controlPlane.savingsEvents.length, 1);
  assert.equal(controlPlane.incidents.length, 0);
});

test("completed idempotency key skips duplicate without another side effect", async () => {
  const { runtime, controlPlane } = fixtureRuntime();
  let calls = 0;
  const args = {
    tenantId: "tenant-a",
    automationInstanceId: "wf-1",
    workflowKey: "TEST_WORKFLOW",
    idempotencyKey: "same-key",
    input: {},
    handler: async () => {
      calls += 1;
      return { status: "completed", metrics: { eligibleUnits: 1, automatedUnits: 1 } };
    },
  };
  const first = await runtime.execute(args);
  const second = await runtime.execute(args);
  assert.equal(first.status, "completed");
  assert.equal(second.status, "skipped_duplicate");
  assert.equal(calls, 1);
  assert.equal(controlPlane.executionRuns.length, 1);
  assert.equal(controlPlane.savingsEvents.length, 1);
});

test("failed execution creates incident, emits no savings and may be retried after repair", async () => {
  const { runtime, controlPlane } = fixtureRuntime();
  let fail = true;
  const args = {
    tenantId: "tenant-a",
    automationInstanceId: "wf-1",
    workflowKey: "TEST_WORKFLOW",
    idempotencyKey: "repairable-key",
    input: {},
    handler: async () => {
      if (fail) throw new PermanentError("broken", { code: "BROKEN_PROVIDER", customerSafeMessage: "Connector needs attention." });
      return { status: "completed", metrics: { eligibleUnits: 1, automatedUnits: 1 } };
    },
  };
  const failed = await runtime.execute(args);
  assert.equal(failed.status, "failed");
  assert.equal(controlPlane.incidents.length, 1);
  assert.equal(controlPlane.savingsEvents.length, 0);
  fail = false;
  const repaired = await runtime.execute(args);
  assert.equal(repaired.status, "completed");
  assert.equal(controlPlane.executionRuns.length, 2);
  assert.equal(controlPlane.savingsEvents.length, 1);
});
