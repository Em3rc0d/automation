#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const input=process.argv[2] || path.join(root,'n8n','case003-kapso-verification-gate9.template.json');
const output=process.argv[3] || path.join(process.cwd(),'case003-kapso-verification-gate9.rendered.json');

const supabaseUrl=String(process.env.CASE003_SUPABASE_URL||'').trim().replace(/\/$/,'');
const publishableKey=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'').trim();

if(!/^https:\/\//.test(supabaseUrl)) throw new Error('CASE003_SUPABASE_URL missing or invalid');
if(!publishableKey || publishableKey.includes('__CASE003_')) throw new Error('CASE003_SUPABASE_PUBLISHABLE_KEY missing or invalid');

const raw=fs.readFileSync(input,'utf8');
const rendered=raw
  .split('__CASE003_SUPABASE_URL__').join(supabaseUrl)
  .split('__CASE003_SUPABASE_PUBLISHABLE_KEY__').join(publishableKey);

if(rendered.includes('__CASE003_')) throw new Error('unresolved CASE003 template placeholder');

const workflow=JSON.parse(rendered);
for(const node of workflow.nodes||[]){
  if(typeof node.parameters?.jsCode==='string'){
    new Function(node.parameters.jsCode);
  }
}
for(const id of ['process-provider','verify-provider-code']){
  const node=(workflow.nodes||[]).find(n=>n.id===id);
  if(!node) throw new Error('missing Gate-9 RPC node: '+id);
  if(!/^https:\/\//.test(String(node.parameters?.url||''))) throw new Error('invalid Gate-9 RPC URL: '+id);
  const headers=node.parameters?.headerParameters?.parameters||[];
  const apiKey=String(headers.find(h=>h.name==='apikey')?.value||'');
  if(!apiKey) throw new Error('missing Gate-9 publishable key: '+id);
}

fs.writeFileSync(output,JSON.stringify(workflow,null,2)+'\n',{mode:0o600});
console.log('[case003-gate9-render] PASS output='+output);
