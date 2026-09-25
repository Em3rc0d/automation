import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { intakeSupportRequest, normalizeSupportRequest } from "../src/workflows/support-intake.js";

function fixture(){
 const controlPlane=new MemoryControlPlane();
 return {controlPlane,runtime:new SavingsRuntime({controlPlane,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")})};
}

test("support intake normalizes and persists ticket",async()=>{
 const {runtime,controlPlane}=fixture();
 const tickets=new MemoryTableAdapter();
 const result=await intakeSupportRequest({runtime,ticketStore:tickets,tenantId:"t",automationInstanceId:"support",
  request:{sourceSystem:"whatsapp",sourceId:"m1",subject:"  Help  ",message:"  Machine   stopped ",channel:"whatsapp",requester:{name:"Ana"}}});
 assert.equal(result.status,"completed");
 const stored=await tickets.list({tenantId:"t"});
 assert.equal(stored[0].body,"Machine stopped");
 assert.equal(controlPlane.savingsEvents[0].automatedUnits,1);
});

test("support intake duplicate source message creates one ticket and one savings event",async()=>{
 const {runtime,controlPlane}=fixture();
 const tickets=new MemoryTableAdapter();
 const args={runtime,ticketStore:tickets,tenantId:"t",automationInstanceId:"support",
  request:{sourceSystem:"email",sourceId:"same",message:"Need help"}};
 await intakeSupportRequest(args);
 const second=await intakeSupportRequest(args);
 assert.equal(second.status,"skipped_duplicate");
 assert.equal((await tickets.list({tenantId:"t"})).length,1);
 assert.equal(controlPlane.savingsEvents.length,1);
});

test("support request cannot be empty",()=>assert.throws(()=>normalizeSupportRequest({sourceId:"1"})));
