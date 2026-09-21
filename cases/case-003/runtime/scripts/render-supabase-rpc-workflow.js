#!/usr/bin/env node
'use strict';
const fs=require('fs');
const input=process.argv[2]||'/opt/case003/n8n/case003-due-date-evaluation-supabase-rpc.template.json';
const output=process.argv[3]||'/tmp/case003-due-date-evaluation-supabase-rpc.json';
const url=String(process.env.CASE003_SUPABASE_URL||'').replace(/\/$/,'');
const key=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'');
if(!/^https:\/\//.test(url)) throw new Error('CASE003_SUPABASE_URL missing/invalid');
if(!key) throw new Error('CASE003_SUPABASE_PUBLISHABLE_KEY missing');
let text=fs.readFileSync(input,'utf8');
text=text.replaceAll('__CASE003_SUPABASE_URL__',url).replaceAll('__CASE003_SUPABASE_PUBLISHABLE_KEY__',key);
JSON.parse(text);
fs.writeFileSync(output,text,{mode:0o600});
console.log('[case003-gate2] rendered Supabase RPC workflow to '+output);
