#!/usr/bin/env node
'use strict';
const fs=require('fs');
const input=process.argv[2]||'/opt/case003/n8n/case003-kapso-ingress-gate7-postgres.template.json';
const output=process.argv[3]||'/tmp/case003-kapso-ingress-gate7-postgres.json';
const hmacId=String(process.env.CASE003_KAPSO_HMAC_CREDENTIAL_ID||'');
const hmacName=String(process.env.CASE003_KAPSO_HMAC_CREDENTIAL_NAME||'CASE003 Kapso HMAC');
if(!hmacId) throw new Error('CASE003_KAPSO_HMAC_CREDENTIAL_ID missing');
const w=JSON.parse(fs.readFileSync(input,'utf8'));
const hmac=w.nodes.find(n=>n.id==='kapso-hmac');
if(!hmac) throw new Error('Gate-7 HMAC node missing');
hmac.credentials={crypto:{id:hmacId,name:hmacName}};
fs.writeFileSync(output,JSON.stringify(w,null,2)+'\n',{mode:0o600});
console.log('[case003-gate7] rendered PostgreSQL workflow');
