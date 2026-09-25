import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js";
import { ingestLead } from "../../src/workflows/lead-intake.js";
const cp=new MemoryControlPlane();
const runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")});
const store=new MemoryTableAdapter();
const result=await ingestLead({runtime,leadSource:store,tenantId:"tenant-demo",automationInstanceId:"lead-intake-demo",
 inbound:{sourceSystem:"web-form",sourceId:"demo-1",name:"Demo Lead",email:"demo@example.test",company:"Demo SAC"}});
const output={status:result.status,leads:await store.list({tenantId:"tenant-demo"}),savingsEvents:cp.savingsEvents.length};
if(process.argv.includes("--assert")){assert.equal(output.status,"completed");assert.equal(output.leads.length,1);assert.equal(output.savingsEvents,1);}
console.log(JSON.stringify({demo:"lead-intake",...output},null,2));
