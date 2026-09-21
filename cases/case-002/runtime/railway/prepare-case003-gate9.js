#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const sourceWorkflowId='kapsoMessageReceiveV1';
const template='/opt/case002/case003-kapso-verification-gate9.template.json';
const output='/tmp/case003-kapso-verification-gate9.json';
const exported='/tmp/case003-kapso-source-gate9.json';

function exportWorkflow(id,file){
  execFileSync(N8N,['export:workflow','--id='+id,'--output='+file],{env:process.env,stdio:['ignore','ignore','pipe']});
  const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
  const list=Array.isArray(parsed)?parsed:[parsed];
  const w=list.find(x=>x&&x.id===id);
  if(!w) throw new Error('workflow export missing '+id);
  return w;
}
function dbPath(){
  const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
  const n8nDir=path.join(userFolder,'.n8n');
  const configured=process.env.DB_SQLITE_DATABASE;
  return configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');
}
const all=(db,sql,p=[])=>new Promise((resolve,reject)=>db.all(sql,p,(e,r)=>e?reject(e):resolve(r||[])));

(async()=>{
  try{
    const source=exportWorkflow(sourceWorkflowId,exported);
    const sourceHmac=source.nodes.find(n=>n.name==='Calculate Kapso HMAC');
    const binding=sourceHmac?.credentials?.crypto;
    if(!binding?.id) throw new Error('live CASE-002 Kapso HMAC credential binding missing');

    const db=new sqlite3.Database(dbPath(),sqlite3.OPEN_READONLY);
    const creds=await all(db,'select id,name,type from credentials_entity where id in (?,?) order by id',[binding.id,'case003RpcAuthV1']);
    await new Promise(r=>db.close(()=>r()));
    const hmacCred=creds.find(c=>c.id===binding.id&&c.type==='crypto');
    const rpcCred=creds.find(c=>c.id==='case003RpcAuthV1'&&c.type==='httpHeaderAuth');
    if(!hmacCred) throw new Error('bound Kapso crypto credential metadata missing');
    if(!rpcCred) throw new Error('CASE-003 RPC credential metadata missing');

    const raw=fs.readFileSync(template,'utf8');
    const supabaseUrl=String(process.env.CASE003_SUPABASE_URL||'').trim().replace(/\/$/,'');
    const publishableKey=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'').trim();
    if(!/^https:\/\//.test(supabaseUrl)) throw new Error('CASE003_SUPABASE_URL missing or invalid');
    if(!publishableKey || publishableKey.includes('__CASE003_')) throw new Error('CASE003_SUPABASE_PUBLISHABLE_KEY missing or invalid');
    const rendered=raw
      .split('__CASE003_SUPABASE_URL__').join(supabaseUrl)
      .split('__CASE003_SUPABASE_PUBLISHABLE_KEY__').join(publishableKey);
    if(rendered.includes('__CASE003_')) throw new Error('unresolved CASE003 template placeholder');
    const w=JSON.parse(rendered);
    const hmac=w.nodes.find(n=>n.id==='kapso-hmac');
    const rpcNodes=w.nodes.filter(n=>['process-provider','verify-provider-code'].includes(n.id));
    if(!hmac||rpcNodes.length!==2) throw new Error('Gate-9 template nodes missing');
    hmac.credentials={crypto:{id:hmacCred.id,name:hmacCred.name}};
    for(const n of rpcNodes) n.credentials={httpHeaderAuth:{id:rpcCred.id,name:rpcCred.name}};
    fs.writeFileSync(output,JSON.stringify(w,null,2)+'\n',{mode:0o600});
    console.log('[case003-gate9] PREPARE PASS source='+sourceWorkflowId+' hmacCredentialId='+hmacCred.id+' rpcCredentialId='+rpcCred.id);
  } finally {
    try{fs.unlinkSync(exported);}catch(_){}
  }
})().catch(e=>{console.error('[case003-gate9] PREPARE FAIL '+(e.stack||e.message));process.exit(1);});
