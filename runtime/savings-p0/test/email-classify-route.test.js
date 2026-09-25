import test from "node:test";
import assert from "node:assert/strict";
import { SavingsRuntime } from "../src/runtime.js";
import { MemoryControlPlane, MemoryIdempotencyStore } from "../src/stores.js";
import { MemoryTableAdapter } from "../src/adapters/memory-table.js";
import { classifyEmail, classifyAndRouteEmail } from "../src/workflows/email-classify-route.js";

function runtimeFixture(){
  const controlPlane=new MemoryControlPlane();
  return {controlPlane,runtime:new SavingsRuntime({controlPlane,idempotencyStore:new MemoryIdempotencyStore(),clock:()=>new Date("2026-09-24T12:00:00Z")})};
}
const config={rules:[
  {key:"invoice",category:"billing",queue:"finance",keywords:["invoice","factura"]},
  {key:"supplier",category:"supplier",queue:"procurement",fromDomains:["supplier.test"]},
],defaultQueue:"general"};

test("email classifier applies deterministic keyword/domain rules and default",()=>{
  assert.equal(classifyEmail({id:"1",subject:"Invoice 123",body:""},config).queue,"finance");
  assert.equal(classifyEmail({id:"2",from:{address:"a@supplier.test"},subject:"hello"},config).queue,"procurement");
  assert.equal(classifyEmail({id:"3",subject:"hello"},config).queue,"general");
});

test("email classification persists route and is duplicate-safe",async()=>{
  const {runtime,controlPlane}=runtimeFixture();
  const routes=new MemoryTableAdapter();
  const args={runtime,routeStore:routes,tenantId:"t",automationInstanceId:"email-route",
    email:{id:"email-1",subject:"Factura pendiente",body:"Please review",from:{address:"x@example.test"}},config};
  const first=await classifyAndRouteEmail(args);
  const second=await classifyAndRouteEmail(args);
  assert.equal(first.output.queue,"finance");
  assert.equal(second.status,"skipped_duplicate");
  assert.equal((await routes.list({tenantId:"t"})).length,1);
  assert.equal(controlPlane.savingsEvents.length,1);
});
