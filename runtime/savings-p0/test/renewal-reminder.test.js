import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";
import { daysUntilRenewal, evaluateRenewal, runRenewalReminderBatch } from "../src/workflows/renewal-reminder.js";

function fixture(){
 const controlPlane=new MemoryControlPlane();
 return {controlPlane,runtime:new SavingsRuntime({controlPlane,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")})};
}
test("renewal offset is deterministic and closed contract is skipped",()=>{
 assert.equal(daysUntilRenewal({renewalDate:"2026-10-24",asOfDate:"2026-09-24"}),30);
 assert.equal(evaluateRenewal({id:"x",status:"terminated",renewalDate:"2026-10-24"},{asOfDate:"2026-09-24",reminderOffsetsDays:[30]}).eligible,false);
});
test("renewal reminder sends, tracks missing contact and is duplicate-safe",async()=>{
 const {runtime,controlPlane}=fixture();
 const contracts=new MemoryTableAdapter([
  {id:"send",tenantId:"t",status:"active",renewalDate:"2026-10-24",contact:{address:"customer@example.test",channel:"email"}},
  {id:"missing",tenantId:"t",status:"active",renewalDate:"2026-10-24"},
  {id:"later",tenantId:"t",status:"active",renewalDate:"2026-11-24",contact:{address:"later@example.test"}},
 ]);
 const messages=new MemoryMessageAdapter();
 const args={runtime,contractSource:contracts,messageAdapter:messages,tenantId:"t",automationInstanceId:"renew",asOfDate:"2026-09-24",config:{reminderOffsetsDays:[30]}};
 const first=await runRenewalReminderBatch(args);
 const second=await runRenewalReminderBatch(args);
 assert.equal(first.eligible,2);
 assert.equal(messages.sent.length,1);
 assert.equal(controlPlane.savingsEvents.length,2);
 assert.equal(second.executions.every(x=>x.status==="skipped_duplicate"),true);
});
