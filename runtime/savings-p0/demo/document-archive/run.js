import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryStorageAdapter } from "../../src/adapters/memory-storage.js"; import { archiveDocument } from "../../src/workflows/document-archive.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")}), storage=new MemoryStorageAdapter();
const result=await archiveDocument({runtime,storageAdapter:storage,tenantId:"tenant-demo",automationInstanceId:"archive-demo",
 document:{id:"doc-1",documentDate:"2026-09-24",documentType:"invoice",name:"F001.pdf",content:"pdf"}});
if(process.argv.includes("--assert")){assert.equal(result.status,"completed");assert.equal((await storage.list({tenantId:"tenant-demo"})).length,1);}
console.log(JSON.stringify({demo:"document-archive",path:result.output.path},null,2));
