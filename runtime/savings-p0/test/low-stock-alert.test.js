import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { MemoryMessageAdapter } from "../src/adapters/memory-message.js";
import { evaluateLowStock, runLowStockAlert } from "../src/workflows/low-stock-alert.js";

function fixture(){
 const controlPlane=new MemoryControlPlane();
 return {controlPlane,runtime:new SavingsRuntime({controlPlane,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")})};
}

test("low stock includes exact threshold and excludes sufficient stock",()=>{
 assert.equal(evaluateLowStock({id:"a",onHand:5,reorderPoint:5}).eligible,true);
 assert.equal(evaluateLowStock({id:"b",onHand:6,reorderPoint:5}).eligible,false);
});

test("low stock alerts once per stock fingerprint and tracks missing contact",async()=>{
 const {runtime,controlPlane}=fixture();
 const inventory=new MemoryTableAdapter([
  {id:"low",tenantId:"t",sku:"S1",onHand:2,reorderPoint:5,alertContact:{address:"ops@example.test",channel:"email"}},
  {id:"missing",tenantId:"t",sku:"S2",onHand:1,reorderPoint:3},
  {id:"ok",tenantId:"t",sku:"S3",onHand:10,reorderPoint:3,alertContact:{address:"ops@example.test"}},
 ]);
 const messages=new MemoryMessageAdapter();
 const args={runtime,inventorySource:inventory,messageAdapter:messages,tenantId:"t",automationInstanceId:"stock"};
 const first=await runLowStockAlert(args);
 const second=await runLowStockAlert(args);
 assert.equal(first.eligible,2);
 assert.equal(messages.sent.length,1);
 assert.equal(controlPlane.savingsEvents.length,2);
 assert.equal(second.executions.every(x=>x.status==="skipped_duplicate"),true);
});
