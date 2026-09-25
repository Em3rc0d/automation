import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore } from "../src/stores.js";
import { MemoryStorageAdapter } from "../src/adapters/memory-storage.js";
import { archiveDocument, buildArchivePath } from "../src/workflows/document-archive.js";

function fixture(){
  const controlPlane=new MemoryControlPlane();
  return {controlPlane,runtime:new SavingsRuntime({controlPlane,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")})};
}

test("archive path is deterministic and sanitized",()=>{
  assert.equal(buildArchivePath({id:"d1",documentDate:"2026-09-02",documentType:"invoice",name:"F/001.pdf"},{prefix:"docs"}),
    "docs/2026/09/invoice/F-001.pdf");
});

test("document archive writes once and duplicate execution does not duplicate savings",async()=>{
  const {runtime,controlPlane}=fixture();
  const storage=new MemoryStorageAdapter();
  const args={runtime,storageAdapter:storage,tenantId:"t",automationInstanceId:"archive",
    document:{id:"d1",documentDate:"2026-09-02",documentType:"invoice",name:"F001.pdf",content:"pdf"}};
  const first=await archiveDocument(args);
  const second=await archiveDocument(args);
  assert.equal(first.status,"completed");
  assert.equal(second.status,"skipped_duplicate");
  assert.equal((await storage.list({tenantId:"t"})).length,1);
  assert.equal(controlPlane.savingsEvents.length,1);
});
