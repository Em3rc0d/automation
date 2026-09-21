#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const {parse}=req('flatted');

const mode=process.argv[2];
if(!['pre','first','second'].includes(mode)){console.error('usage: validate-case003-gate3-execution.js <pre|first|second>');process.exit(2);}

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
async function latest(db){
  return await get(db,
    'select e.id,e.status,e.mode,e."workflowId" as workflowId,d.data from execution_entity e left join execution_data d on d."executionId"=e.id where e."workflowId"=? and e.mode=\'cli\' order by cast(e.id as integer) desc limit 1',
    [workflowId]
  );
}
function rowsFor(data,nodeName){
  const runs=data?.resultData?.runData?.[nodeName];
  if(!Array.isArray(runs)||runs.length===0) return null;
  return (runs[runs.length-1]?.data?.main?.[0]||[]).map(x=>x.json);
}
function requireSuccess(row){
  if(!row) throw new Error('no CLI execution found');
  if(row.status!=='success'){
    let message=row.status;
    try{const d=row.data?parse(row.data):null;message=d?.resultData?.error?.message||d?.resultData?.error?.description||row.status;}catch{}
    throw new Error('execution status='+row.status+' error='+sanitize(message));
  }
  if(!row.data) throw new Error('successful execution has no persisted execution_data');
  const data=parse(row.data);
  if(data?.resultData?.error) throw new Error('resultData.error='+sanitize(data.resultData.error.message||data.resultData.error.description));
  return data;
}
function isTrue(v){return v===true||String(v).toLowerCase()==='true';}
function isFalse(v){return v===false||String(v).toLowerCase()==='false';}

(async()=>{
  const db=await openDb();
  const row=await latest(db);

  if(mode==='pre'){
    fs.writeFileSync(checkpoint,JSON.stringify({preExecutionId:row?.id??null},null,2)+'\n',{mode:0o600});
    console.log('[case003-gate3-test] PRE latestCliExecutionId='+(row?.id??'none'));
    await close(db);
    return;
  }

  if(!fs.existsSync(checkpoint)) throw new Error('Gate-3 execution checkpoint missing');
  const state=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
  const data=requireSuccess(row);

  if(mode==='first'){
    if(String(row.id)===String(state.preExecutionId)) throw new Error('first execution did not create a new persisted execution');
    const reserveRows=rowsFor(data,'Reserve Due Notifications');
    if(!reserveRows||reserveRows.length<1) throw new Error('reservation RPC returned no rows');
    const expected=reserveRows.find(r=>r.invoice_id===expectedInvoiceId);
    if(!expected) throw new Error('expected synthetic invoice absent from reservation RPC');
    if(!isTrue(expected.reserved)) throw new Error('first execution did not reserve expected invoice');
    if(!expected.notification_id||!expected.idempotency_key) throw new Error('reservation identity missing');

    const allowed=rowsFor(data,'Allow Newly Reserved');
    if(!allowed||!allowed.some(r=>r.invoice_id===expectedInvoiceId)) throw new Error('new reservation was not allowed through filter');
    const payload=rowsFor(data,'Build Notification Payload');
    const p=payload?.find(r=>r.invoice_id===expectedInvoiceId);
    if(!p||p.deliveryAllowed!==true||p.notificationKey!==expected.idempotency_key) throw new Error('Gate-3 payload missing or inconsistent');

    state.firstExecutionId=row.id;
    state.notificationId=expected.notification_id;
    state.idempotencyKey=expected.idempotency_key;
    fs.writeFileSync(checkpoint,JSON.stringify(state,null,2)+'\n',{mode:0o600});
    console.log('[case003-gate3-test] FIRST PASS executionId='+row.id+' invoice='+expected.invoice_reference+' reserved=true notificationId='+expected.notification_id);
  }else{
    if(!state.firstExecutionId) throw new Error('first execution evidence missing');
    if(String(row.id)===String(state.firstExecutionId)) throw new Error('second execution did not create a new persisted execution');
    const reserveRows=rowsFor(data,'Reserve Due Notifications');
    if(!reserveRows||reserveRows.length<1) throw new Error('second reservation RPC returned no rows');
    const expected=reserveRows.find(r=>r.invoice_id===expectedInvoiceId);
    if(!expected) throw new Error('expected synthetic invoice absent on second execution');
    if(!isFalse(expected.reserved)) throw new Error('duplicate reservation was not rejected');
    if(expected.notification_id!==state.notificationId) throw new Error('duplicate returned a different notification_id');
    if(expected.idempotency_key!==state.idempotencyKey) throw new Error('duplicate returned a different idempotency_key');

    const allowed=rowsFor(data,'Allow Newly Reserved');
    if(allowed===null) throw new Error('idempotency filter did not execute on second run');
    if(allowed.length!==0) throw new Error('duplicate passed through idempotency filter');
    const payload=rowsFor(data,'Build Notification Payload');
    if(payload&&payload.length!==0) throw new Error('duplicate reached notification payload');

    state.secondExecutionId=row.id;
    fs.writeFileSync(checkpoint,JSON.stringify(state,null,2)+'\n',{mode:0o600});
    console.log('[case003-gate3-test] SECOND PASS executionId='+row.id+' invoice='+expected.invoice_reference+' reserved=false duplicateBlocked=true notificationId='+expected.notification_id);
  }
  await close(db);
})().catch(e=>{console.error('[case003-gate3-test] FAIL: '+sanitize(e.stack||e.message));process.exit(1);});
