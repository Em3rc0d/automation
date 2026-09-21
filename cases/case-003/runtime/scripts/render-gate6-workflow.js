#!/usr/bin/env node
'use strict';
const fs=require('fs');
const input=process.argv[2]||'/opt/case003/n8n/case003-supplier-channel-gate6.template.json';
const output=process.argv[3]||'/tmp/case003-supplier-channel-gate6.json';
const values={
  '__CASE003_SUPABASE_URL__':String(process.env.CASE003_SUPABASE_URL||'').replace(/\/$/,''),
  '__CASE003_SUPABASE_PUBLISHABLE_KEY__':String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||''),
  '__CASE003_GATE6_TENANT_ID__':String(process.env.CASE003_GATE6_TENANT_ID||'')
};
if(!/^https:\/\//.test(values.__CASE003_SUPABASE_URL__)) throw new Error('CASE003_SUPABASE_URL missing/invalid');
for(const [k,v] of Object.entries(values)) if(!v) throw new Error('missing '+k);
let text=fs.readFileSync(input,'utf8');
for(const [k,v] of Object.entries(values)) text=text.replaceAll(k,v);
if(/__CASE003_[A-Z0-9_]+__/.test(text)) throw new Error('unresolved Gate-6 placeholder');
JSON.parse(text);
fs.writeFileSync(output,text,{mode:0o600});
console.log('[case003-gate6] rendered workflow to '+output);
