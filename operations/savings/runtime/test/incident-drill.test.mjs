import test from "node:test";
import assert from "node:assert/strict";

import { runIncidentDrill } from "../incident_drill.mjs";

test("incident drill fails safe then repairs without duplicate side effects", async () => {
  const evidence = await runIncidentDrill();
  assert.equal(evidence.productionEvidence, false);
  assert.equal(evidence.result, "PASS");
  assert.equal(evidence.failure.status, "failed");
  assert.equal(evidence.failure.incidentCount, 1);
  assert.equal(evidence.failure.savingsEvents, 0);
  assert.equal(evidence.repair.status, "completed");
  assert.equal(evidence.repair.outboundSideEffects, 1);
  assert.equal(evidence.repair.savingsEvents, 1);
  assert.equal(evidence.repair.duplicateSideEffects, 0);
});
