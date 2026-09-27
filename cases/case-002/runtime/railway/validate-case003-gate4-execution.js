#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const {parse}=req('flatted');

const mode=process.argv[2];
if(!['pre','first','second'].includes(mode)){console.error('usage: validate-case003-gate4-execution.js <pre|first|second>');process.exit(2);}

const workflowId='case003DueDateEvaluationV1';
const checkpoint='/tmp/case003-gate4-execution.json';
const expectedInvoiceId=process.env.CASE003_GATE4_EXPECTED_INVOICE_ID||'500806df-3cb8-5cef-b751-491cad848cf8';
const expectedSnapshotId=process.env.CASE003_GATE4_EXPECTED_SNAPSHOT_ID||'b1ea19f1-ed7d-54b5-9009-10759dd6126d';
const expectedReference=process.env.CASE003_GATE4_EXPECTED_REFERENCE||'01-FM01-0096939';
const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');

function openDb(){return new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});}
function get(db,sql,p=[]){return new Promise((resolve,reject)=>db.get(sql,p,(e,r)=>e?reject(e):resolve(r)));}
function close(db){return new Promise(resolve=>db.close(()=>resolve()));}
function clean(v){return String(v??'').replace(/[A-Za-z0-9_\\/+\-=]{32,}/g,'[redacted]').slice(0,700);}
async function latest(db){
  return await get(db,'select e.id,e.status,e.mode,e."workflowId" as workflowId,d.data from execution_entity e left join execution_data d on d."executionId"=e.id where e."workflowId"=? and e.mode=\'cli\' order by cast(e.id as integer) desc limit 1',[workflowId]);
}
function rowsFor(data,name){
  const runs=data?.resultData?.runData?.[name];
  if(!Array.isArray(runs)||runs.length===0) return null;
  return (runs[runs.length-1]?.data?.main?.[0]||[]).map(x=>x.json);
}
function okData(row){
  if(!row) throw new Error('no CLI execution found');
  if(row.status!=='success') throw new Error('execution status='+row.status);
  if(!row.data) throw new Error('missing persisted execution data');
  const d=parse(row.data);
  if(d?.resultData?.error) throw new Error('execution error='+clean(d.resultData.error.message||d.resultData.error.description));
  return d;
}
const yes=v=>v===true||String(v).toLowerCase()==='true';
const no=v=>v===false||String(v).toLowerCase()==='false';

(async()=>{
  const db=await openDb();
  const row=await latest(db);

  if(mode==='pre'){
    fs.writeFileSync(checkpoint,JSON.stringify({preExecutionId:row?.id??null},null,2)+'\n',{mode:0o600});
    console.log('[case003-gate4-test] PRE latestCliExecutionId='+(row?.id??'none'));
    await close(db);
    return;
  }

  if(!fs.existsSync(checkpoint)) throw new Error('Gate-4 execution checkpoint missing');
  const state=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
  const data=okData(row);

  if(mode==='first'){
    if(String(row.id)===String(state.preExecutionId)) throw new Error('first execution did not create a new persisted execution');
    const reserve=rowsFor(data,'Reserve Due Notifications');
    if(!reserve||reserve.length!==1) throw new Error('expected exactly one real due candidate, got '+(reserve?.length??0));
    const item=reserve[0];
    if(item.invoice_id!==expectedInvoiceId) throw new Error('unexpected invoice id');
    if(item.snapshot_id!==expectedSnapshotId) throw new Error('unexpected snapshot id');
    if(item.invoice_reference!==expectedReference) throw new Error('unexpected invoice reference');
    if(item.due_date_source!=='FBL1N') throw new Error('expected FBL1N due-date precedence');
    if(item.payment_status_evidence!=='PAYMENT_DATE_EVIDENCE') throw new Error('expected PAYMENT_DATE_EVIDENCE');
    if(!yes(item.reserved)) throw new Error('first real execution was not newly reserved');
    if(!item.notification_id||!item.idempotency_key) throw new Error('reservation identity missing');

    const allowed=rowsFor(data,'Allow Newly Reserved');
    if(!allowed||allowed.length!==1||allowed[0].invoice_id!==expectedInvoiceId) throw new Error('real reservation did not pass idempotency filter');
    const payload=rowsFor(data,'Build Notification Payload');
    if(!payload||payload.length!==1||payload[0].deliveryAllowed!==true||payload[0].notificationKey!==item.idempotency_key) throw new Error('real notification payload mismatch');

    Object.assign(state,{firstExecutionId:row.id,notificationId:item.notification_id,idempotencyKey:item.idempotency_key,canonicalDueDate:item.canonical_due_date});
    fs.writeFileSync(checkpoint,JSON.stringify(state,null,2)+'\n',{mode:0o600});
    console.log('[case003-gate4-test] FIRST PASS executionId='+row.id+' invoice='+item.invoice_reference+' snapshot='+item.snapshot_id+' dueDate='+item.canonical_due_date+' source='+item.due_date_source+' paymentEvidence='+item.payment_status_evidence+' reserved=true notificationId='+item.notification_id);
  } else {
    if(!state.firstExecutionId) throw new Error('first execution evidence missing');
    if(String(row.id)===String(state.firstExecutionId)) throw new Error('second execution did not create a new persisted execution');
    const reserve=rowsFor(data,'Reserve Due Notifications');
    if(!reserve||reserve.length!==1) throw new Error('expected one due candidate on duplicate run');
    const item=reserve[0];
    if(item.invoice_id!==expectedInvoiceId||item.snapshot_id!==expectedSnapshotId) throw new Error('duplicate run candidate changed');
    if(!no(item.reserved)) throw new Error('duplicate real reservation was not rejected');
    if(item.notification_id!==state.notificationId||item.idempotency_key!==state.idempotencyKey) throw new Error('duplicate reservation identity changed');

    const allowed=rowsFor(data,'Allow Newly Reserved');
    if(allowed===null||allowed.length!==0) throw new Error('duplicate passed idempotency filter');
    const payload=rowsFor(data,'Build Notification Payload');
    if(payload&&payload.length!==0) throw new Error('duplicate reached notification payload');

    console.log('[case003-gate4-test] SECOND PASS executionId='+row.id+' invoice='+item.invoice_reference+' snapshot='+item.snapshot_id+' reserved=false duplicateBlocked=true notificationId='+item.notification_id);
  }
  await close(db);
})().catch(e=>{console.error('[case003-gate4-test] FAIL: '+clean(e.stack||e.message));process.exit(1);});
