#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const mode=process.argv[2];
if(!['pre','post'].includes(mode)){console.error('usage: verify-case003-gate7-test.js <pre|post>');process.exit(2);}
const targetId='case003KapsoIngressGate7V1';
const sourceId='kapsoMessageReceiveV1';
const checkpoint='/tmp/case003-gate7-test-pre.json';
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
 const target=workflows.find(w=>w.id===targetId);
 const source=workflows.find(w=>w.id===sourceId);
 if(!target||!source) throw new Error('Gate-7 target/source workflow missing');
 if(mode==='pre'){
   if(!(target.active===0||target.active===false||target.active==='0')) throw new Error('Gate-7 must begin inactive');
   fs.writeFileSync(checkpoint,JSON.stringify({
     workflowCount:workflows.length,credentialCount:credentials.length,
     targetNodesHash:sha(target.nodes),targetConnectionsHash:sha(target.connections),
     workflows:workflows.filter(w=>w.id!==targetId).map(w=>({id:w.id,name:w.name,active:w.active,nodesHash:sha(w.nodes),connectionsHash:sha(w.connections)})),
     credentials:credentials.map(c=>({id:c.id,name:c.name,type:c.type,dataHash:sha(c.data)}))
   },null,2)+'\n',{mode:0o600});
   console.log('[case003-gate7-test] PRE PASS workflows='+workflows.length+' credentials='+credentials.length+' sourceActive='+source.active+' targetInactive=true');
 } else {
   if(!fs.existsSync(checkpoint)) throw new Error('Gate-7 test checkpoint missing');
   const before=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
   if(workflows.length!==before.workflowCount||credentials.length!==before.credentialCount) throw new Error('state count changed');
   for(const old of before.credentials){const now=credentials.find(c=>c.id===old.id);if(!now||now.name!==old.name||now.type!==old.type||sha(now.data)!==old.dataHash)throw new Error('credential changed:'+old.id);}
   for(const old of before.workflows){const now=workflows.find(w=>w.id===old.id);if(!now||now.name!==old.name||now.active!==old.active||sha(now.nodes)!==old.nodesHash||sha(now.connections)!==old.connectionsHash)throw new Error('non-target workflow changed:'+old.id);}
   const t=workflows.find(w=>w.id===targetId);
   if(!(t.active===0||t.active===false||t.active==='0')) throw new Error('Gate-7 not restored inactive');
   if(sha(t.nodes)!==before.targetNodesHash||sha(t.connections)!==before.targetConnectionsHash) throw new Error('Gate-7 definition changed during test');
   console.log('[case003-gate7-test] POST PASS workflows='+workflows.length+' credentials='+credentials.length+' targetInactive=true existingState=unchanged');
 }
 await close(db);
})().catch(e=>{console.error('[case003-gate7-test] FAIL '+(e.stack||e.message));process.exit(1);});
