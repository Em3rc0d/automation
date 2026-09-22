#!/usr/bin/env node
'use strict';
const fs=require('fs');
const input=process.argv[2]||'/opt/case003/n8n/case003-due-date-reservation-supabase-rpc.template.json';
const output=process.argv[3]||'/tmp/case003-due-date-reservation-supabase-rpc.json';
const url=String(process.env.CASE003_SUPABASE_URL||'').replace(/\/$/,'');
const key=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'');
const rule=String(process.env.CASE003_RULE_CODE||'due_3d');
if(!/^https:\/\//.test(url)) throw new Error('CASE003_SUPABASE_URL missing/invalid');
if(!key) throw new Error('CASE003_SUPABASE_PUBLISHABLE_KEY missing');
if(!/^[a-z0-9_.:-]{1,64}$/.test(rule)) throw new Error('CASE003_RULE_CODE invalid');
let text=fs.readFileSync(input,'utf8');
text=text.replaceAll('__CASE003_SUPABASE_URL__',url)
         .replaceAll('__CASE003_SUPABASE_PUBLISHABLE_KEY__',key)
         .replaceAll('__CASE003_RULE_CODE__',rule);
JSON.parse(text);
fs.writeFileSync(output,text,{mode:0o600});
console.log('[case003-gate3] rendered Supabase reservation workflow to '+output);
