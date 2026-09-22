#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const {parse}=req('flatted');
const mode=process.argv[2];
if(!['pre','first','second'].includes(mode)){console.error('usage: validate-gate3-execution.js <pre|first|second>');process.exit(2);}
const workflowId='case003DueDateEvaluationV1';
const checkpoint='/tmp/case003-gate3-execution.json';
const expectedInvoiceId=process.env.CASE003_EXPECTED_SMOKE_INVOICE_ID||'30000000-0000-0000-0000-000000000100';
const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');
function openDb(){return new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});}
function get(db,sql,p=[]){return new Promise((resolve,reject)=>db.get(sql,p,(e,r)=>e?reject(e):resolve(r)));}
function close(db){return new Promise(resolve=>db.close(()=>resolve()));}
function sanitize(v){return String(v??'').replace(/[A-Za-z0-9_\\/+\-=]{32,}/g,'[redacted]').slice(0,700);}
async function latest(db){return await get(db,'select e.id,e.status,e.mode,e."workflowId" as workflowId,d.data from execution_entity e left join execution_data d on d."executionId"=e.id where e."workflowId"=? and e.mode=\'cli\' order by cast(e.id as integer) desc limit 1',[workflowId]);}
function rowsFor(data,nodeName){const runs=data?.resultData?.runData?.[nodeName];if(!Array.isArray(runs)||runs.length===0)return null;return (runs[runs.length-1]?.data?.main?.[0]||[]).map(x=>x.json);}
function success(row){if(!row)throw new Error('no CLI execution');if(row.status!=='success')throw new Error('execution status='+row.status);if(!row.data)throw new Error('missing execution_data');const d=parse(row.data);if(d?.resultData?.error)throw new Error('execution error='+sanitize(d.resultData.error.message));return d;}
const yes=v=>v===true||String(v).toLowerCase()==='true';
const no=v=>v===false||String(v).toLowerCase()==='false';
(async()=>{
 const db=await openDb(), row=await latest(db);
 if(mode==='pre'){fs.writeFileSync(checkpoint,JSON.stringify({preExecutionId:row?.id??null},null,2)+'\n',{mode:0o600});console.log('[case003-gate3-test] PRE latestCliExecutionId='+(row?.id??'none'));await close(db);return;}
 if(!fs.existsSync(checkpoint))throw new Error('checkpoint missing');
 const state=JSON.parse(fs.readFileSync(checkpoint,'utf8')), data=success(row);
 if(mode==='first'){
   if(String(row.id)===String(state.preExecutionId))throw new Error('no new first execution');
   const reserve=rowsFor(data,'Reserve Due Notifications');if(!reserve?.length)throw new Error('no reservation rows');
   const expected=reserve.find(r=>r.invoice_id===expectedInvoiceId);if(!expected||!yes(expected.reserved))throw new Error('expected invoice was not newly reserved');
   if(!expected.notification_id||!expected.idempotency_key)throw new Error('reservation identity missing');
   const allowed=rowsFor(data,'Allow Newly Reserved');if(!allowed?.some(r=>r.invoice_id===expectedInvoiceId))throw new Error('new reservation blocked unexpectedly');
   const payload=rowsFor(data,'Build Notification Payload');const p=payload?.find(r=>r.invoice_id===expectedInvoiceId);
   if(!p||p.deliveryAllowed!==true||p.notificationKey!==expected.idempotency_key)throw new Error('payload mismatch');
   Object.assign(state,{firstExecutionId:row.id,notificationId:expected.notification_id,idempotencyKey:expected.idempotency_key});
   fs.writeFileSync(checkpoint,JSON.stringify(state,null,2)+'\n',{mode:0o600});
   console.log('[case003-gate3-test] FIRST PASS executionId='+row.id+' reserved=true notificationId='+expected.notification_id);
 }else{
   if(String(row.id)===String(state.firstExecutionId))throw new Error('no new second execution');
   const reserve=rowsFor(data,'Reserve Due Notifications');if(!reserve?.length)throw new Error('no second reservation rows');
   const expected=reserve.find(r=>r.invoice_id===expectedInvoiceId);if(!expected||!no(expected.reserved))throw new Error('duplicate was not rejected');
   if(expected.notification_id!==state.notificationId||expected.idempotency_key!==state.idempotencyKey)throw new Error('duplicate identity changed');
   const allowed=rowsFor(data,'Allow Newly Reserved');if(allowed===null||allowed.length!==0)throw new Error('duplicate passed idempotency filter');
   const payload=rowsFor(data,'Build Notification Payload');if(payload&&payload.length!==0)throw new Error('duplicate reached payload');
   console.log('[case003-gate3-test] SECOND PASS executionId='+row.id+' reserved=false duplicateBlocked=true notificationId='+expected.notification_id);
 }
 await close(db);
})().catch(e=>{console.error('[case003-gate3-test] FAIL: '+sanitize(e.stack||e.message));process.exit(1);});
