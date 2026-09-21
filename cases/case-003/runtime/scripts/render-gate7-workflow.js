#!/usr/bin/env node
'use strict';
const fs=require('fs');
const input=process.argv[2]||'/opt/case003/n8n/case003-kapso-ingress-gate7.template.json';
const output=process.argv[3]||'/tmp/case003-kapso-ingress-gate7.json';
const supabaseUrl=String(process.env.CASE003_SUPABASE_URL||'').replace(/\/$/,'');
const publishable=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'');
const hmacId=String(process.env.CASE003_KAPSO_HMAC_CREDENTIAL_ID||'');
const hmacName=String(process.env.CASE003_KAPSO_HMAC_CREDENTIAL_NAME||'CASE003 Kapso HMAC');
if(!/^https:\/\//.test(supabaseUrl)) throw new Error('CASE003_SUPABASE_URL missing/invalid');
if(!publishable) throw new Error('CASE003_SUPABASE_PUBLISHABLE_KEY missing');
if(!hmacId) throw new Error('CASE003_KAPSO_HMAC_CREDENTIAL_ID missing');
let raw=fs.readFileSync(input,'utf8')
  .replaceAll('__CASE003_SUPABASE_URL__',supabaseUrl)
  .replaceAll('__CASE003_SUPABASE_PUBLISHABLE_KEY__',publishable);
const w=JSON.parse(raw);
const hmac=w.nodes.find(n=>n.id==='kapso-hmac');
if(!hmac) throw new Error('Gate-7 HMAC node missing');
hmac.credentials={crypto:{id:hmacId,name:hmacName}};
if(/__CASE003_[A-Z0-9_]+__/.test(JSON.stringify(w))) throw new Error('unresolved Gate-7 placeholder');
fs.writeFileSync(output,JSON.stringify(w,null,2)+'\n',{mode:0o600});
console.log('[case003-gate7] rendered Supabase workflow');
