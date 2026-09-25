import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryTableAdapter } from "../../src/adapters/memory-table.js"; import { classifyAndRouteEmail } from "../../src/workflows/email-classify-route.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")}), routes=new MemoryTableAdapter();
const result=await classifyAndRouteEmail({runtime,routeStore:routes,tenantId:"tenant-demo",automationInstanceId:"email-route-demo",
 email:{id:"mail-1",subject:"Factura F001",body:"Adjunto comprobante",from:{address:"supplier@example.test"}},
 config:{rules:[{key:"invoice",category:"billing",queue:"finance",keywords:["factura"]}],defaultQueue:"general"}});
if(process.argv.includes("--assert")){assert.equal(result.output.queue,"finance");assert.equal((await routes.list({tenantId:"tenant-demo"})).length,1);}
console.log(JSON.stringify({demo:"email-classify-route",output:result.output},null,2));
