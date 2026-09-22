#!/usr/bin/env node
'use strict';
const path=require('path'),os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const {parse}=req('flatted');

const workflowId='case003SupplierQueryGate5V1';
const expectedInvoice=String(process.env.CASE003_GATE5_INVOICE_REFERENCE||'');
const expectedCompany=String(process.env.CASE003_GATE5_COMPANY_CODE||'');
const expectedFi=String(process.env.CASE003_GATE5_FI_DOCUMENT||'');
const expectedSnapshot=String(process.env.CASE003_GATE5_SNAPSHOT_ID||'');
for(const [k,v] of Object.entries({expectedInvoice,expectedCompany,expectedFi,expectedSnapshot})) if(!v) throw new Error('missing '+k);

const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');
const open=()=>new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});
const get=(db,sql,p=[])=>new Promise((resolve,reject)=>db.get(sql,p,(e,r)=>e?reject(e):resolve(r)));
const close=db=>new Promise(resolve=>db.close(()=>resolve()));
const rowsFor=(data,name)=>{const runs=data?.resultData?.runData?.[name];if(!Array.isArray(runs)||!runs.length)return null;return (runs[runs.length-1]?.data?.main?.[0]||[]).map(x=>x.json);};

(async()=>{
 const db=await open();
 const row=await get(db,'select e.id,e.status,e.mode,d.data from execution_entity e left join execution_data d on d."executionId"=e.id where e."workflowId"=? and e.mode=\'cli\' order by cast(e.id as integer) desc limit 1',[workflowId]);
 if(!row||row.status!=='success'||!row.data) throw new Error('Gate-5 CLI execution missing/failed');
 const data=parse(row.data);
 if(data?.resultData?.error) throw new Error('Gate-5 execution error='+(data.resultData.error.message||'unknown'));
 const query=rowsFor(data,'Query Supplier Invoice');
 const asserted=rowsFor(data,'Assert Access Decisions');
 const response=rowsFor(data,'Build Safe Supplier Response');
 if(!query||query.length!==4||!asserted||asserted.length!==4||!response||response.length!==4) throw new Error('Gate-5 item-count invariant failed');

 const byTrace=Object.fromEntries(query.map(x=>[x.trace_id,x]));
 const positive=byTrace['gate5-positive'];
 if(positive?.decision!=='FOUND'||positive.invoice_reference!==expectedInvoice||positive.company_code!==expectedCompany||positive.fi_document_number!==expectedFi||positive.snapshot_id!==expectedSnapshot) throw new Error('positive Gate-5 result mismatch');
 for(const t of ['gate5-wrong-vendor','gate5-no-permission']){
   const j=byTrace[t];
   if(j?.decision!=='NOT_FOUND_OR_NOT_AUTHORIZED'||j.invoice_reference!=null||j.snapshot_id!=null) throw new Error(t+' leaked or wrong decision');
 }
 const unknown=byTrace['gate5-unknown'];
 if(unknown?.decision!=='AUTH_REQUIRED'||unknown.invoice_reference!=null||unknown.snapshot_id!=null) throw new Error('unknown identity handling failed');
 const out=Object.fromEntries(response.map(x=>[x.trace_id,x]));
 if(out['gate5-positive']?.response_type!=='invoice_status'||out['gate5-positive']?.channel_delivery!=='disabled') throw new Error('positive safe response mismatch');
 if(out['gate5-wrong-vendor']?.response_type!=='neutral_not_found_or_not_authorized') throw new Error('wrong-vendor response not neutral');
 if(out['gate5-no-permission']?.response_type!=='neutral_not_found_or_not_authorized') throw new Error('no-permission response not neutral');
 if(out['gate5-unknown']?.response_type!=='verification_required') throw new Error('unknown response mismatch');
 console.log('[case003-gate5-test] PASS executionId='+row.id+' decisions=4 positive=FOUND denials=neutral unknown=AUTH_REQUIRED outbound=disabled');
 await close(db);
})().catch(e=>{console.error('[case003-gate5-test] FAIL: '+(e.stack||e.message));process.exit(1);});
