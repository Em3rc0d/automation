import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js"; import { MemoryMessageAdapter } from "../../src/adapters/memory-message.js";
import { runRenewalReminderBatch } from "../../src/workflows/renewal-reminder.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")});
const source=new MemoryTableAdapter([{id:"c1",tenantId:"tenant-demo",status:"active",renewalDate:"2026-10-24",contact:{address:"customer@example.test"}}]), messages=new MemoryMessageAdapter();
const batch=await runRenewalReminderBatch({runtime,contractSource:source,messageAdapter:messages,tenantId:"tenant-demo",automationInstanceId:"renew-demo",asOfDate:"2026-09-24",config:{reminderOffsetsDays:[30]}});
if(process.argv.includes("--assert")){assert.equal(batch.eligible,1);assert.equal(messages.sent.length,1);}
console.log(JSON.stringify({demo:"renewal-reminder",eligible:batch.eligible,sent:messages.sent.length},null,2));
