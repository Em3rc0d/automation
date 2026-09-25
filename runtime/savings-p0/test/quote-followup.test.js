import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore, sequentialIdFactory } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";
import { evaluateQuoteFollowup, runQuoteFollowupBatch } from "../src/workflows/quote-followup.js";

function fixture() {
  const controlPlane = new MemoryControlPlane({ idFactory: sequentialIdFactory("qf") });
  return { controlPlane, runtime: new SavingsRuntime({
    controlPlane, idempotencyStore: new MemoryIdempotencyStore(),
    clock: () => new Date("2026-09-24T12:00:00Z"),
  }) };
}

const stages=[{key:"d2",delayDays:2,templateKey:"q2"},{key:"d5",delayDays:5,templateKey:"q5"}];

test("quote follow-up skips accepted quote and chooses first due stage", () => {
  assert.equal(evaluateQuoteFollowup({id:"c",status:"accepted",deliveredAt:"2026-09-20T12:00:00Z"},
    {asOf:"2026-09-24T12:00:00Z",stages}).eligible,false);
  assert.equal(evaluateQuoteFollowup({id:"o",status:"pending",deliveredAt:"2026-09-20T12:00:00Z"},
    {asOf:"2026-09-24T12:00:00Z",stages}).stage.key,"d2");
});

test("quote follow-up sends, persists stage and handles missing contact", async () => {
  const {runtime,controlPlane}=fixture();
  const quotes=new MemoryTableAdapter([
    {id:"send",tenantId:"t",status:"pending",deliveredAt:"2026-09-20T12:00:00Z",quoteNumber:"Q1",contact:{address:"q@example.test",channel:"email"}},
    {id:"missing",tenantId:"t",status:"pending",deliveredAt:"2026-09-20T12:00:00Z",quoteNumber:"Q2",contact:{address:""}},
    {id:"closed",tenantId:"t",status:"accepted",deliveredAt:"2026-09-20T12:00:00Z",contact:{address:"x@example.test"}},
  ]);
  const messages=new MemoryMessageAdapter();
  const args={runtime,quoteSource:quotes,messageAdapter:messages,tenantId:"t",automationInstanceId:"qf",asOf:"2026-09-24T12:00:00Z",config:{stages,minSpacingHours:12}};
  const first=await runQuoteFollowupBatch(args);
  const second=await runQuoteFollowupBatch(args);
  assert.equal(first.eligible,2);
  assert.equal(messages.sent.length,1);
  assert.equal(second.eligible,1);
  assert.equal(second.executions[0].quoteId,"missing");
  const stored=(await quotes.list({tenantId:"t"})).find(x=>x.id==="send");
  assert.deepEqual(stored.followup.completedStages,["d2"]);
  assert.equal(controlPlane.savingsEvents.length,2);
});
