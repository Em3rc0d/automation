#!/usr/bin/env node
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

import { SavingsRuntime } from "../../../runtime/savings-p0/src/runtime.js";
import {
  MemoryControlPlane,
  MemoryIdempotencyStore,
  sequentialIdFactory,
} from "../../../runtime/savings-p0/src/stores.js";
import { MemoryTableAdapter } from "../../../runtime/savings-p0/src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../../../runtime/savings-p0/src/adapters/memory-message.js";
import { runPaymentReminderBatch } from "../../../runtime/savings-p0/src/workflows/payment-reminder.js";

export async function runIncidentDrill() {
  const tenantId = "mk1-incident-drill";
  const automationInstanceId = "payment-reminder-drill";
  const invoice = {
    id: "incident-invoice-001",
    tenantId,
    invoiceNumber: "DRILL-001",
    customerName: "Incident Drill Customer",
    status: "open",
    dueDate: "2026-09-25",
    amount: 100,
    currency: "PEN",
    contact: { channel: "email", address: "incident@example.test" },
  };
  const sideEffectKey = `${tenantId}:payment-reminder:${invoice.id}:offset:0`;

  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("drill") });
  const idempotencyStore = new MemoryIdempotencyStore();
  const runtime = new SavingsRuntime({
    controlPlane,
    idempotencyStore,
    clock: () => new Date("2026-09-25T12:00:00Z"),
  });
  const source = new MemoryTableAdapter([invoice]);
  const message = new MemoryMessageAdapter({
    permanentFailures: [sideEffectKey],
  });

  const args = {
    runtime,
    invoiceSource: source,
    messageAdapter: message,
    tenantId,
    automationInstanceId,
    asOfDate: "2026-09-25",
    config: { reminderOffsetsDays: [0] },
  };

  const failure = await runPaymentReminderBatch(args);
  const first = failure.executions[0];
  if (first?.status !== "failed") {
    throw new Error(`incident drill expected failed execution, got ${first?.status}`);
  }
  if (controlPlane.incidents.length !== 1) {
    throw new Error("incident drill expected exactly one incident after provider failure");
  }
  if (controlPlane.savingsEvents.length !== 0) {
    throw new Error("incident drill must not count savings on failed execution");
  }

  message.permanentFailures.delete(sideEffectKey);
  const repaired = await runPaymentReminderBatch(args);
  const second = repaired.executions[0];
  if (second?.status !== "completed") {
    throw new Error(`incident drill repair expected completed execution, got ${second?.status}`);
  }
  if (message.sent.length !== 1) {
    throw new Error(`incident drill expected one outbound side effect, got ${message.sent.length}`);
  }
  if (controlPlane.savingsEvents.length !== 1) {
    throw new Error("incident drill expected one savings event after successful repair");
  }

  return {
    schemaVersion: 1,
    evidenceType: "INCIDENT_REHEARSAL",
    productionEvidence: false,
    tenantId,
    workflowKey: "PAYMENT_REMINDER_AUTOMATION",
    runtimeProfile: "zero-deps-node-v1",
    failure: {
      status: first.status,
      incidentCount: 1,
      savingsEvents: 0,
      incident: controlPlane.incidents[0],
    },
    repair: {
      status: second.status,
      outboundSideEffects: message.sent.length,
      savingsEvents: controlPlane.savingsEvents.length,
      duplicateSideEffects: 0,
    },
    result: "PASS",
    limitations: [
      "Uses in-memory provider adapter; a real pilot still requires a live-provider incident drill.",
      "Does not close MK1/P1 production incident evidence.",
    ],
  };
}

async function main() {
  const evidence = await runIncidentDrill();
  if (process.argv.includes("--assert")) {
    assert.equal(evidence.result, "PASS");
    assert.equal(evidence.failure.status, "failed");
    assert.equal(evidence.failure.incidentCount, 1);
    assert.equal(evidence.failure.savingsEvents, 0);
    assert.equal(evidence.repair.status, "completed");
    assert.equal(evidence.repair.outboundSideEffects, 1);
    assert.equal(evidence.repair.savingsEvents, 1);
  }
  console.log(JSON.stringify(evidence, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}`);
    process.exitCode = 2;
  });
}
