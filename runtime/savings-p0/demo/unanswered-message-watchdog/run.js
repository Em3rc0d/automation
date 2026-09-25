import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js"; import { MemoryMessageAdapter } from "../../src/adapters/memory-message.js";
import { runUnansweredMessageWatchdog } from "../../src/workflows/unanswered-message-watchdog.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")});
const source=new MemoryTableAdapter([{id:"th1",tenantId:"tenant-demo",lastInboundAt:"2026-09-24T06:00:00Z",owner:{contact:{address:"owner@example.test"}}}]);
const messages=new MemoryMessageAdapter();
const batch=await runUnansweredMessageWatchdog({runtime,threadSource:source,messageAdapter:messages,tenantId:"tenant-demo",automationInstanceId:"watchdog-demo",asOf:"2026-09-24T12:00:00Z",config:{slaHours:4}});
if(process.argv.includes("--assert")){assert.equal(batch.eligible,1);assert.equal(messages.sent.length,1);assert.equal(cp.savingsEvents.length,1);}
console.log(JSON.stringify({demo:"unanswered-message-watchdog",eligible:batch.eligible,sent:messages.sent.length},null,2));
