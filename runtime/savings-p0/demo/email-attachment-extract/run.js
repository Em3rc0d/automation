import assert from "node:assert/strict";
import { SavingsRuntime } from "../../src/runtime.js"; import { MemoryControlPlane, MemoryIdempotencyStore } from "../../src/stores.js";
import { MemoryStorageAdapter } from "../../src/adapters/memory-storage.js"; import { extractEmailAttachments } from "../../src/workflows/email-attachment-extract.js";
const cp=new MemoryControlPlane(), runtime=new SavingsRuntime({controlPlane:cp,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")}), storage=new MemoryStorageAdapter();
const batch=await extractEmailAttachments({runtime,storageAdapter:storage,tenantId:"tenant-demo",automationInstanceId:"att-demo",
 email:{id:"mail-1",attachments:[{id:"a1",name:"invoice.pdf",mimeType:"application/pdf",sizeBytes:20,content:"pdf"}]}});
if(process.argv.includes("--assert")){assert.equal(batch.eligible,1);assert.equal((await storage.list({tenantId:"tenant-demo"})).length,1);}
console.log(JSON.stringify({demo:"email-attachment-extract",eligible:batch.eligible,stored:(await storage.list({tenantId:"tenant-demo"})).length},null,2));
