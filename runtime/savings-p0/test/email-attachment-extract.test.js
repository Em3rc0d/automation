import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore } from "../src/stores.js";
import { MemoryStorageAdapter } from "../src/adapters/memory-storage.js";
import { eligibleAttachments, extractEmailAttachments } from "../src/workflows/email-attachment-extract.js";

function fixture(){
  const controlPlane=new MemoryControlPlane();
  return {controlPlane,runtime:new SavingsRuntime({controlPlane,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")})};
}

test("attachment eligibility filters MIME and size",()=>{
  const evaluated=eligibleAttachments({id:"e",attachments:[
    {id:"a",mimeType:"application/pdf",sizeBytes:10},
    {id:"b",mimeType:"image/png",sizeBytes:10},
    {id:"c",mimeType:"application/pdf",sizeBytes:999},
  ]},{allowedMimeTypes:["application/pdf"],maxBytes:100});
  assert.deepEqual(evaluated.map(x=>x.reason),["eligible","mime_not_allowed","size_exceeded"]);
});

test("attachment extraction stores eligible files and duplicate run is safe",async()=>{
  const {runtime,controlPlane}=fixture();
  const storage=new MemoryStorageAdapter();
  const email={id:"e1",attachments:[
    {id:"a1",name:"invoice.pdf",mimeType:"application/pdf",sizeBytes:20,content:"pdf"},
    {id:"a2",name:"photo.png",mimeType:"image/png",sizeBytes:20,content:"png"},
  ]};
  const args={runtime,storageAdapter:storage,tenantId:"t",automationInstanceId:"extract",email,
    config:{allowedMimeTypes:["application/pdf"],maxBytes:100}};
  const first=await extractEmailAttachments(args);
  const second=await extractEmailAttachments(args);
  assert.equal(first.eligible,1);
  assert.equal(first.skipped.length,1);
  assert.equal(second.executions[0].status,"skipped_duplicate");
  assert.equal((await storage.list({tenantId:"t"})).length,1);
  assert.equal(controlPlane.savingsEvents.length,1);
});

test("attachment extraction retries transient storage error once",async()=>{
  const {runtime}=fixture();
  const key="t:email-attachment:e2:a2";
  const storage=new MemoryStorageAdapter({transientFailures:{[key]:1}});
  const batch=await extractEmailAttachments({
    runtime,storageAdapter:storage,tenantId:"t",automationInstanceId:"extract",
    email:{id:"e2",attachments:[{id:"a2",name:"x.pdf",mimeType:"application/pdf",sizeBytes:1,content:"x"}]},
  });
  assert.equal(batch.executions[0].status,"completed");
  assert.equal(storage.attempts.get(key),2);
});
