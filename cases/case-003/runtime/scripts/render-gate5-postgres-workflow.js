#!/usr/bin/env node
'use strict';
const fs=require('fs');
const input=process.argv[2]||'/opt/case003/n8n/case003-supplier-query-gate5-postgres.template.json';
const output=process.argv[3]||'/tmp/case003-supplier-query-gate5-postgres.json';
const values={
  '__CASE003_GATE5_TENANT_ID__':String(process.env.CASE003_GATE5_TENANT_ID||''),
  '__CASE003_GATE5_INVOICE_REFERENCE__':String(process.env.CASE003_GATE5_INVOICE_REFERENCE||''),
  '__CASE003_GATE5_COMPANY_CODE__':String(process.env.CASE003_GATE5_COMPANY_CODE||''),
  '__CASE003_GATE5_FI_DOCUMENT__':String(process.env.CASE003_GATE5_FI_DOCUMENT||''),
  '__CASE003_GATE5_SNAPSHOT_ID__':String(process.env.CASE003_GATE5_SNAPSHOT_ID||''),
};
for(const [k,v] of Object.entries(values)) if(!v) throw new Error('missing value for '+k);
let text=fs.readFileSync(input,'utf8');
for(const [k,v] of Object.entries(values)) text=text.replaceAll(k,v);
if(/__CASE003_[A-Z0-9_]+__/.test(text)) throw new Error('unresolved Gate-5 placeholder');
JSON.parse(text);
fs.writeFileSync(output,text,{mode:0o600});
console.log('[case003-gate5] rendered direct-PostgreSQL workflow to '+output);
