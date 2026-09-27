#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');

const mode=process.argv[2];
if(!['pre','post'].includes(mode)){console.error('usage: verify-case003-trigger-split.js <pre|post>');process.exit(2);}
const manualId='case003DueDateEvaluationV1';
const scheduleId='case003DueDateScheduleV1';
const checkpoint='/tmp/case003-trigger-split-pre.json';
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
 const manual=workflows.find(w=>w.id===manualId);
 const schedule=workflows.find(w=>w.id===scheduleId);

 if(mode==='pre'){
   if(!manual) throw new Error('CASE-003 manual workflow missing');
   if(schedule) throw new Error('schedule workflow already exists; refusing additive split');
   if(!(manual.active===0||manual.active===false||manual.active==='0')) throw new Error('manual workflow must be inactive');
   fs.writeFileSync(checkpoint,JSON.stringify({
     workflowCount:workflows.length,
     credentialCount:credentials.length,
     credentials:credentials.map(c=>({id:c.id,name:c.name,type:c.type,dataHash:sha(c.data)})),
     protectedWorkflows:workflows.filter(w=>w.id!==manualId).map(w=>({id:w.id,name:w.name,active:w.active,nodesHash:sha(w.nodes),connectionsHash:sha(w.connections)}))
   },null,2)+'\n',{mode:0o600});
   console.log('[case003-split] PRE PASS workflows='+workflows.length+' credentials='+credentials.length+' schedule=absent manual=inactive');
 } else {
   if(!fs.existsSync(checkpoint)) throw new Error('split checkpoint missing');
   const before=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
   if(workflows.length!==before.workflowCount+1) throw new Error('workflow count mismatch');
   if(credentials.length!==before.credentialCount) throw new Error('credential count changed');
   for(const old of before.credentials){const now=credentials.find(c=>c.id===old.id);if(!now||now.name!==old.name||now.type!==old.type||sha(now.data)!==old.dataHash) throw new Error('credential changed: '+old.id);}
   for(const old of before.protectedWorkflows){const now=workflows.find(w=>w.id===old.id);if(!now||now.name!==old.name||now.active!==old.active||sha(now.nodes)!==old.nodesHash||sha(now.connections)!==old.connectionsHash) throw new Error('protected workflow changed: '+old.id);}
   const m=workflows.find(w=>w.id===manualId), s=workflows.find(w=>w.id===scheduleId);
   if(!m||!s) throw new Error('split workflows missing');
   if(!(m.active===0||m.active===false||m.active==='0')||!(s.active===0||s.active===false||s.active==='0')) throw new Error('split workflows must remain inactive');
   const mn=JSON.parse(m.nodes), sn=JSON.parse(s.nodes);
   if(mn.some(n=>n.id==='schedule')||!mn.some(n=>n.id==='manual')) throw new Error('manual workflow trigger isolation failed');
   if(sn.some(n=>n.id==='manual')||!sn.some(n=>n.id==='schedule')) throw new Error('schedule workflow trigger isolation failed');
   if(mn.filter(n=>n.type&&String(n.type).includes('Trigger')).length!==1) throw new Error('manual workflow has multiple triggers');
   if(sn.filter(n=>n.type&&String(n.type).includes('Trigger')).length!==1) throw new Error('schedule workflow has multiple triggers');
   console.log('[case003-split] POST PASS workflows='+workflows.length+' credentials='+credentials.length+' manual=single-trigger schedule=single-trigger protectedState=unchanged');
 }
 await close(db);
})().catch(e=>{console.error('[case003-split] FAIL: '+(e.stack||e.message));process.exit(1);});
