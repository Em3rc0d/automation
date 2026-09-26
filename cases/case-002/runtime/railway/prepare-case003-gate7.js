#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const sourceWorkflowId='kapsoMessageReceiveV1';
const template='/opt/case002/case003-kapso-ingress-gate7.template.json';
const output='/tmp/case003-kapso-ingress-gate7.json';
const exported='/tmp/case003-kapso-source.json';

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

    const w=JSON.parse(fs.readFileSync(template,'utf8'));
    const hmac=w.nodes.find(n=>n.id==='kapso-hmac');
    const rpc=w.nodes.find(n=>n.id==='process-provider');
    if(!hmac||!rpc) throw new Error('Gate-7 template nodes missing');
    hmac.credentials={crypto:{id:hmacCred.id,name:hmacCred.name}};
    rpc.credentials={httpHeaderAuth:{id:rpcCred.id,name:rpcCred.name}};
    fs.writeFileSync(output,JSON.stringify(w,null,2)+'\n',{mode:0o600});
    console.log('[case003-gate7] PREPARE PASS source='+sourceWorkflowId+' hmacCredentialId='+hmacCred.id+' rpcCredentialId='+rpcCred.id);
  } finally {
    try{fs.unlinkSync(exported);}catch(_){}
  }
})().catch(e=>{console.error('[case003-gate7] PREPARE FAIL '+(e.stack||e.message));process.exit(1);});
