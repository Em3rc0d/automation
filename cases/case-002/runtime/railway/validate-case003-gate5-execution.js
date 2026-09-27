#!/usr/bin/env node
'use strict';
const path=require('path'),os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const {parse}=req('flatted');

const workflowId='case003SupplierQueryGate5V1';
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
 if(!row) throw new Error('no Gate-5 CLI execution found');
 if(row.status!=='success') throw new Error('Gate-5 execution status='+row.status);
 if(!row.data) throw new Error('Gate-5 execution_data missing');
 const data=parse(row.data);
 if(data?.resultData?.error) throw new Error('Gate-5 result error='+(data.resultData.error.message||'unknown'));

 const query=rowsFor(data,'Query Supplier Invoice');
 const asserted=rowsFor(data,'Assert Access Decisions');
 const response=rowsFor(data,'Build Safe Supplier Response');
 if(!query||query.length!==4) throw new Error('expected 4 query decisions');
 if(!asserted||asserted.length!==4||asserted.some(x=>x.gate5Assertion!==true)) throw new Error('Gate-5 assertions missing');
 if(!response||response.length!==4) throw new Error('expected 4 safe responses');

 const byTrace=Object.fromEntries(query.map(x=>[x.trace_id,x]));
 if(byTrace['gate5-positive']?.decision!=='FOUND') throw new Error('positive decision failed');
 if(byTrace['gate5-positive']?.invoice_reference!=='01-FM01-0096939') throw new Error('positive invoice mismatch');
 if(byTrace['gate5-positive']?.snapshot_id!=='b1ea19f1-ed7d-54b5-9009-10759dd6126d') throw new Error('positive snapshot mismatch');
 for(const t of ['gate5-wrong-vendor','gate5-no-permission']){
   if(byTrace[t]?.decision!=='NOT_FOUND_OR_NOT_AUTHORIZED') throw new Error(t+' decision failed');
   if(byTrace[t]?.invoice_reference!=null||byTrace[t]?.snapshot_id!=null) throw new Error(t+' leaked resource fields');
 }
 if(byTrace['gate5-unknown']?.decision!=='AUTH_REQUIRED') throw new Error('unknown identity decision failed');
 if(byTrace['gate5-unknown']?.invoice_reference!=null||byTrace['gate5-unknown']?.snapshot_id!=null) throw new Error('unknown identity leaked resource fields');

 const out=Object.fromEntries(response.map(x=>[x.trace_id,x]));
 if(out['gate5-positive']?.response_type!=='invoice_status'||out['gate5-positive']?.channel_delivery!=='disabled') throw new Error('positive safe response mismatch');
 if(out['gate5-wrong-vendor']?.response_type!=='neutral_not_found_or_not_authorized') throw new Error('wrong-vendor response not neutral');
 if(out['gate5-no-permission']?.response_type!=='neutral_not_found_or_not_authorized') throw new Error('no-permission response not neutral');
 if(out['gate5-unknown']?.response_type!=='verification_required') throw new Error('unknown response mismatch');

 console.log('[case003-gate5-test] PASS executionId='+row.id+' positive=FOUND wrongVendor=NEUTRAL noPermission=NEUTRAL unknown=AUTH_REQUIRED responses=4 outbound=disabled');
 await close(db);
})().catch(e=>{console.error('[case003-gate5-test] FAIL: '+(e.stack||e.message));process.exit(1);});
