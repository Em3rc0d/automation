#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const mode=process.argv[2];
if(!['pre','post'].includes(mode)){console.error('usage: verify-gate3-binding.js <pre|post>');process.exit(2);}
const workflowId='case003DueDateEvaluationV1';
const credentialId=process.env.CASE003_GATE3_CREDENTIAL_ID||'case003RpcAuthV1';
const credentialType=process.env.CASE003_GATE3_CREDENTIAL_TYPE||'httpHeaderAuth';
const nodeId=process.env.CASE003_GATE3_NODE_ID||'reserve-rpc';
const slot=process.env.CASE003_GATE3_CREDENTIAL_SLOT||credentialType;
const checkpoint='/tmp/case003-gate3-binding-pre.json';
const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');
const sha=v=>crypto.createHash('sha256').update(String(v??'')).digest('hex');
function openDb(){return new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});}
function all(db,sql,p=[]){return new Promise((resolve,reject)=>db.all(sql,p,(e,r)=>e?reject(e):resolve(r)));}
function close(db){return new Promise(resolve=>db.close(()=>resolve()));}
(async()=>{
 const db=await openDb();
 const credentials=await all(db,'select id,name,type,data from credentials_entity order by id');
 const workflows=await all(db,'select id,name,active,nodes,connections from workflow_entity order by id');
 const wf=workflows.find(w=>w.id===workflowId), cred=credentials.find(c=>c.id===credentialId);
 if(mode==='pre'){
   if(!wf) throw new Error('CASE-003 workflow missing');
   if(!(wf.active===0||wf.active===false||wf.active==='0')) throw new Error('CASE-003 must be inactive');
   if(!cred||cred.type!==credentialType) throw new Error('Gate-3 adapter credential missing/mismatched');
   fs.writeFileSync(checkpoint,JSON.stringify({
     workflowCount:workflows.length,credentialCount:credentials.length,
     credentials:credentials.map(c=>({id:c.id,name:c.name,type:c.type,dataHash:sha(c.data)})),
     others:workflows.filter(w=>w.id!==workflowId).map(w=>({id:w.id,name:w.name,active:w.active,nodesHash:sha(w.nodes),connectionsHash:sha(w.connections)}))
   },null,2)+'\n',{mode:0o600});
   console.log('[case003-gate3-bind] PRE PASS credentials='+credentials.length+' workflow=inactive credential=reused');
 }else{
   if(!fs.existsSync(checkpoint)) throw new Error('Gate-3 binding checkpoint missing');
   const before=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
   if(workflows.length!==before.workflowCount||credentials.length!==before.credentialCount) throw new Error('workflow/credential count changed');
   for(const old of before.credentials){const now=credentials.find(c=>c.id===old.id);if(!now||now.name!==old.name||now.type!==old.type||sha(now.data)!==old.dataHash) throw new Error('credential changed: '+old.id);}
   for(const old of before.others){const now=workflows.find(w=>w.id===old.id);if(!now||now.name!==old.name||now.active!==old.active||sha(now.nodes)!==old.nodesHash||sha(now.connections)!==old.connectionsHash) throw new Error('non-CASE003 workflow changed: '+old.id);}
   const target=workflows.find(w=>w.id===workflowId); if(!target) throw new Error('CASE-003 missing');
   if(!(target.active===0||target.active===false||target.active==='0')) throw new Error('CASE-003 unexpectedly active');
   const nodes=JSON.parse(target.nodes), reserve=nodes.find(n=>n.id===nodeId);
   if(reserve?.credentials?.[slot]?.id!==credentialId) throw new Error('Gate-3 reservation node credential mismatch');
   if(!nodes.find(n=>n.id==='allow-new')||!nodes.find(n=>n.id==='payload')) throw new Error('Gate-3 filter/payload nodes missing');
   console.log('[case003-gate3-bind] POST PASS counts=unchanged existingState=unchanged CASE003=inactive reservationPath=bound');
 }
 await close(db);
})().catch(e=>{console.error('[case003-gate3-bind] FAIL: '+(e.stack||e.message));process.exit(1);});
