#!/usr/bin/env node
'use strict';
const fs=require('fs');
const file=process.argv[2]||'/tmp/case003-gate2-execution.json';
const raw=fs.readFileSync(file,'utf8').trim();
const start=raw.indexOf('{'), end=raw.lastIndexOf('}');
if(start<0||end<start) throw new Error('no JSON execution payload found');
const execution=JSON.parse(raw.slice(start,end+1));
if(execution?.data?.resultData?.error) throw new Error('execution contains resultData.error');
const runData=execution?.data?.resultData?.runData;
if(!runData) throw new Error('runData missing');
const runs=runData['Build Idempotency Key'];
if(!Array.isArray(runs)||runs.length===0) throw new Error('Build Idempotency Key run missing');
const rows=(runs[runs.length-1]?.data?.main?.[0]||[]).map(x=>x.json);
if(rows.length<1) throw new Error('Gate-2 query returned no due candidates');
const required=['tenant_id','snapshot_id','invoice_id','supplier_id','invoice_reference','canonical_due_date','due_date_source','payment_status_evidence','notificationKey'];
for(const row of rows) for(const k of required) if(row[k]===undefined||row[k]===null||row[k]==='') throw new Error('row missing '+k);
console.log('[case003-gate2-test] PASS rows='+rows.length);
for(const row of rows) console.log('[case003-gate2-test] row invoice_reference='+row.invoice_reference+' due_date='+row.canonical_due_date+' due_source='+row.due_date_source+' payment_evidence='+row.payment_status_evidence);
