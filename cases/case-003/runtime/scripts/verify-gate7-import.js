#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const mode=process.argv[2],adapter=process.argv[3]||'rpc';
if(!['pre','post'].includes(mode)||!['rpc','postgres'].includes(adapter)){
  console.error('usage: verify-gate7-import.js <pre|post> <rpc|postgres>'); process.exit(2);
}
const targetId='case003KapsoIngressGate7V1';
const hmacId=String(process.env.CASE003_KAPSO_HMAC_CREDENTIAL_ID||'');
if(!hmacId) throw new Error('CASE003_KAPSO_HMAC_CREDENTIAL_ID missing');
const processCredentialId=adapter==='rpc'?'case003RpcAuthV1':'case003PostgresV1';
const processCredentialType=adapter==='rpc'?'httpHeaderAuth':'postgres';
const checkpoint='/tmp/case003-gate7-portable-pre.json';
const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');
const sha=v=>crypto.createHash('sha256').update(String(v??'')).digest('hex');
const open=()=>new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});
const all=(db,sql,p=[])=>new Promise((resolve,reject)=>db.all(sql,p,(e,r)=>e?reject(e):resolve(r||[])));
const close=db=>new Promise(resolve=>db.close(()=>resolve()));

(async()=>{
 const db=await open();
 const workflows=await all(db,'select id,name,active,nodes,connections from workflow_entity order by id');
 const credentials=await all(db,'select id,name,type,data from credentials_entity order by id');
 if(mode==='pre'){
   if(workflows.some(w=>w.id===targetId)) throw new Error('Gate-7 target already exists');
   if(!credentials.find(c=>c.id===hmacId&&c.type==='crypto')) throw new Error('Gate-7 crypto credential missing');
   if(!credentials.find(c=>c.id===processCredentialId&&c.type===processCredentialType)) throw new Error('Gate-7 process credential missing');
   fs.writeFileSync(checkpoint,JSON.stringify({
     workflowCount:workflows.length,credentialCount:credentials.length,
     workflows:workflows.map(w=>({id:w.id,name:w.name,active:w.active,nodesHash:sha(w.nodes),connectionsHash:sha(w.connections)})),
     credentials:credentials.map(c=>({id:c.id,name:c.name,type:c.type,dataHash:sha(c.data)}))
   },null,2)+'\n',{mode:0o600});
   console.log('[case003-gate7] PRE PASS adapter='+adapter+' workflows='+workflows.length+' credentials='+credentials.length);
 }else{
   if(!fs.existsSync(checkpoint)) throw new Error('Gate-7 checkpoint missing');
   const before=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
   if(workflows.length!==before.workflowCount+1||credentials.length!==before.credentialCount) throw new Error('Gate-7 count invariant failed');
   for(const old of before.credentials){const now=credentials.find(c=>c.id===old.id);if(!now||now.name!==old.name||now.type!==old.type||sha(now.data)!==old.dataHash)throw new Error('credential changed:'+old.id);}
   for(const old of before.workflows){const now=workflows.find(w=>w.id===old.id);if(!now||now.name!==old.name||now.active!==old.active||sha(now.nodes)!==old.nodesHash||sha(now.connections)!==old.connectionsHash)throw new Error('workflow changed:'+old.id);}
   const t=workflows.find(w=>w.id===targetId); if(!t) throw new Error('Gate-7 target missing');
   if(!(t.active===0||t.active===false||t.active==='0')) throw new Error('Gate-7 target must remain inactive');
   const nodes=JSON.parse(t.nodes);
   if(nodes.find(n=>n.id==='kapso-hmac')?.credentials?.crypto?.id!==hmacId) throw new Error('Gate-7 HMAC binding mismatch');
   const process=nodes.find(n=>n.id==='process-provider');
   if(adapter==='rpc'&&process?.credentials?.httpHeaderAuth?.id!==processCredentialId) throw new Error('Gate-7 RPC binding mismatch');
   if(adapter==='postgres'&&process?.credentials?.postgres?.id!==processCredentialId) throw new Error('Gate-7 Postgres binding mismatch');
   if(nodes.some(n=>/kapso send|send message|whatsapp send/i.test(String(n.name||'')))) throw new Error('outbound send node detected');
   console.log('[case003-gate7] POST PASS adapter='+adapter+' target=inactive existingState=unchanged');
 }
 await close(db);
})().catch(e=>{console.error('[case003-gate7] FAIL '+(e.stack||e.message));process.exit(1);});
