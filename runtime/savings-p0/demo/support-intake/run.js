import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js"; import { intakeSupportRequest } from "../../src/workflows/support-intake.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")}), tickets=new MemoryTableAdapter();
const result=await intakeSupportRequest({runtime,ticketStore:tickets,tenantId:"tenant-demo",automationInstanceId:"support-demo",request:{sourceSystem:"whatsapp",sourceId:"m1",message:"Mi equipo no enciende",channel:"whatsapp"}});
if(process.argv.includes("--assert")){assert.equal(result.status,"completed");assert.equal((await tickets.list({tenantId:"tenant-demo"})).length,1);}
console.log(JSON.stringify({demo:"support-intake",ticketId:result.output.ticketId},null,2));
