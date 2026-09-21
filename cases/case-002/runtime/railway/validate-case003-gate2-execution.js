#!/usr/bin/env node
'use strict';
const fs=require('fs');
const file=process.argv[2]||'/tmp/case003-gate2-execution.json';
const raw=fs.readFileSync(file,'utf8').trim();
const start=raw.indexOf('{');
const end=raw.lastIndexOf('}');
if(start<0||end<start) throw new Error('no JSON execution payload found');
const execution=JSON.parse(raw.slice(start,end+1));
if(execution?.data?.resultData?.error) throw new Error('execution contains resultData.error');
const runData=execution?.data?.resultData?.runData;
if(!runData) throw new Error('runData missing');
const runs=runData['Build Idempotency Key'];
if(!Array.isArray(runs)||runs.length===0) throw new Error('Build Idempotency Key run missing');
const last=runs[runs.length-1];
const rows=(last?.data?.main?.[0]||[]).map(x=>x.json);
if(rows.length<1) throw new Error('Gate-2 query returned no due candidates');
const required=['tenant_id','snapshot_id','invoice_id','supplier_id','invoice_reference','canonical_due_date','due_date_source','payment_status_evidence','notificationKey'];
for(const row of rows){
  for(const k of required){
    if(row[k]===undefined||row[k]===null||row[k]==='') throw new Error('row missing '+k);
  }
}
const expected=rows.find(r=>r.invoice_id==='30000000-0000-0000-0000-000000000100');
if(!expected) throw new Error('expected synthetic invoice 300...100 not returned');
if(expected.tenant_id!=='30000000-0000-0000-0000-000000000000') throw new Error('synthetic tenant mismatch');
if(expected.due_date_source!=='FBL1N') throw new Error('expected FBL1N due-date precedence');
if(expected.payment_status_evidence!=='UNKNOWN') throw new Error('expected UNKNOWN payment evidence');
if(!String(expected.notificationKey).includes(expected.snapshot_id)) throw new Error('notificationKey does not include snapshot_id');
console.log('[case003-gate2-test] PASS rows='+rows.length+' expectedInvoice='+expected.invoice_reference+' dueDate='+expected.canonical_due_date+' source='+expected.due_date_source+' paymentEvidence='+expected.payment_status_evidence);
