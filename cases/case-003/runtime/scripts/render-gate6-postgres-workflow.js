#!/usr/bin/env node
'use strict';
const fs=require('fs');
const input=process.argv[2]||'/opt/case003/n8n/case003-supplier-channel-gate6-postgres.template.json';
const output=process.argv[3]||'/tmp/case003-supplier-channel-gate6-postgres.json';
const tenant=String(process.env.CASE003_GATE6_TENANT_ID||'');
if(!tenant) throw new Error('CASE003_GATE6_TENANT_ID missing');
let text=fs.readFileSync(input,'utf8').replaceAll('__CASE003_GATE6_TENANT_ID__',tenant);
if(/__CASE003_[A-Z0-9_]+__/.test(text)) throw new Error('unresolved Gate-6 placeholder');
JSON.parse(text);
fs.writeFileSync(output,text,{mode:0o600});
console.log('[case003-gate6] rendered direct-PostgreSQL workflow to '+output);
