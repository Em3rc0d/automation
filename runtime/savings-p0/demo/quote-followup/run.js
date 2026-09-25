import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js"; import { MemoryMessageAdapter } from "../../src/adapters/memory-message.js";
import { runQuoteFollowupBatch } from "../../src/workflows/quote-followup.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")});
const source=new MemoryTableAdapter([{id:"q1",tenantId:"tenant-demo",status:"pending",deliveredAt:"2026-09-20T12:00:00Z",contact:{address:"q@example.test"}}]);
const messages=new MemoryMessageAdapter();
const batch=await runQuoteFollowupBatch({runtime,quoteSource:source,messageAdapter:messages,tenantId:"tenant-demo",automationInstanceId:"qf-demo",asOf:"2026-09-24T12:00:00Z"});
if(process.argv.includes("--assert")){assert.equal(batch.eligible,1);assert.equal(messages.sent.length,1);assert.deepEqual((await source.list({tenantId:"tenant-demo"}))[0].followup.completedStages,["d2"]);}
console.log(JSON.stringify({demo:"quote-followup",eligible:batch.eligible,sent:messages.sent.length},null,2));
