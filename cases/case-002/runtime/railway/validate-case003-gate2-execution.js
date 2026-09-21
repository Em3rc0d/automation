#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const {parse}=req('flatted');

const mode=process.argv[2];
if(!['pre','post'].includes(mode)){
  console.error('usage: validate-case003-gate2-execution.js <pre|post>');
  process.exit(2);
}

const workflowId='case003DueDateEvaluationV1';
const checkpoint='/tmp/case003-gate2-execution-pre.json';
const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');

function openDb(){return new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});}
function get(db,sql,p=[]){return new Promise((resolve,reject)=>db.get(sql,p,(e,r)=>e?reject(e):resolve(r)));}
function close(db){return new Promise(resolve=>db.close(()=>resolve()));}
function sanitize(v){return String(v??'').replace(/[A-Za-z0-9_\\-]{32,}/g,'[redacted]').slice(0,500);}

async function latest(db){
  const sql='select e.id,e.status,e.mode,e."workflowId" as workflowId,d.data '+
    'from execution_entity e left join execution_data d on d."executionId"=e.id '+
    'where e."workflowId"=? and e.mode=\'cli\' '+
    'order by cast(e.id as integer) desc limit 1';
  return await get(db,sql,[workflowId]);
}

(async()=>{
  const db=await openDb();
  const row=await latest(db);

  if(mode==='pre'){
    fs.writeFileSync(checkpoint,JSON.stringify({latestExecutionId:row?.id??null},null,2)+'\\n',{mode:0o600});
    console.log('[case003-gate2-test] PRE execution checkpoint latestCliExecutionId='+(row?.id??'none'));
    await close(db);
    return;
  }

  if(!fs.existsSync(checkpoint)) throw new Error('execution pre-checkpoint missing');
  const before=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
  if(!row) throw new Error('no CLI execution found after test');
  if(String(row.id)===String(before.latestExecutionId)) throw new Error('no new CASE-003 CLI execution was persisted');
  if(row.status!=='success'){
    let message='unknown';
    try{
      const parsed=row.data?parse(row.data):null;
      message=parsed?.resultData?.error?.message||parsed?.resultData?.error?.description||row.status;
    }catch{}
    throw new Error('CASE-003 execution status='+row.status+' error='+sanitize(message));
  }
  if(!row.data) throw new Error('successful CLI execution has no execution_data');

  const data=parse(row.data);
  if(data?.resultData?.error) throw new Error('execution resultData.error='+sanitize(data.resultData.error.message||data.resultData.error.description));
  const runs=data?.resultData?.runData?.['Build Idempotency Key'];
  if(!Array.isArray(runs)||runs.length===0) throw new Error('Build Idempotency Key run missing');
  const rows=(runs[runs.length-1]?.data?.main?.[0]||[]).map(x=>x.json);
  if(rows.length<1) throw new Error('Gate-2 query returned no due candidates');

  const required=['tenant_id','snapshot_id','invoice_id','supplier_id','invoice_reference','canonical_due_date','due_date_source','payment_status_evidence','notificationKey'];
  for(const item of rows){
    for(const k of required){
      if(item[k]===undefined||item[k]===null||item[k]==='') throw new Error('row missing '+k);
    }
  }

  const expected=rows.find(r=>r.invoice_id==='30000000-0000-0000-0000-000000000100');
  if(!expected) throw new Error('expected synthetic invoice 300...100 not returned');
  if(expected.tenant_id!=='30000000-0000-0000-0000-000000000000') throw new Error('synthetic tenant mismatch');
  if(expected.due_date_source!=='FBL1N') throw new Error('expected FBL1N due-date precedence');
  if(expected.payment_status_evidence!=='UNKNOWN') throw new Error('expected UNKNOWN payment evidence');
  if(!String(expected.notificationKey).includes(expected.snapshot_id)) throw new Error('notificationKey does not include snapshot_id');

  console.log('[case003-gate2-test] PASS executionId='+row.id+' rows='+rows.length+' expectedInvoice='+expected.invoice_reference+' dueDate='+expected.canonical_due_date+' source='+expected.due_date_source+' paymentEvidence='+expected.payment_status_evidence);
  await close(db);
})().catch(e=>{
  console.error('[case003-gate2-test] FAIL: '+sanitize(e.stack||e.message));
  process.exit(1);
});
