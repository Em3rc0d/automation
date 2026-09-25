import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js"; import { MemoryMessageAdapter } from "../../src/adapters/memory-message.js";
import { runLowStockAlert } from "../../src/workflows/low-stock-alert.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")});
const source=new MemoryTableAdapter([{id:"sku1",tenantId:"tenant-demo",sku:"SKU-1",onHand:2,reorderPoint:5,alertContact:{address:"ops@example.test"}}]), messages=new MemoryMessageAdapter();
const batch=await runLowStockAlert({runtime,inventorySource:source,messageAdapter:messages,tenantId:"tenant-demo",automationInstanceId:"stock-demo"});
if(process.argv.includes("--assert")){assert.equal(batch.eligible,1);assert.equal(messages.sent.length,1);}
console.log(JSON.stringify({demo:"low-stock-alert",eligible:batch.eligible,sent:messages.sent.length},null,2));
