#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');
const mode=process.argv[2];
if(!['pre','post'].includes(mode)){console.error('usage: verify-case003-import.js <pre|post>');process.exit(2);}
const targetId='case003DueDateEvaluationV1', targetName='CASE-003 Due Date Evaluation';
const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');
const checkpoint='/tmp/case003-pre-import-state.json';
const open=()=>new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});
const get=(db,sql,p=[])=>new Promise((resolve,reject)=>db.get(sql,p,(e,r)=>e?reject(e):resolve(r)));
const close=db=>new Promise(resolve=>db.close(()=>resolve()));
(async()=>{
 if(!fs.existsSync(dbPath)) throw new Error('n8n database missing: '+dbPath);
 const db=await open();
 const workflows=(await get(db,'select count(*) c from workflow_entity')).c;
 const credentials=(await get(db,'select count(*) c from credentials_entity')).c;
 const target=await get(db,'select id,name,active from workflow_entity where id=?',[targetId]);
 if(mode==='pre'){
   if(target) throw new Error('target workflow already exists; refusing additive import');
   const ew=parseInt(process.env.CASE003_EXPECTED_PRE_WORKFLOWS||String(workflows),10);
   const ec=parseInt(process.env.CASE003_EXPECTED_PRE_CREDENTIALS||String(credentials),10);
   if(workflows!==ew) throw new Error(`workflow baseline mismatch expected=${ew} actual=${workflows}`);
   if(credentials!==ec) throw new Error(`credential baseline mismatch expected=${ec} actual=${credentials}`);
   fs.writeFileSync(checkpoint,JSON.stringify({workflows,credentials},null,2)+'\n',{mode:0o600});
   console.log(`[case003-verify] PRE PASS workflows=${workflows} credentials=${credentials} target=absent`);
 }else{
   if(!fs.existsSync(checkpoint)) throw new Error('pre-import checkpoint missing');
   const before=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
   if(!target) throw new Error('target workflow missing after import');
   if(target.name!==targetName) throw new Error('target workflow name mismatch: '+target.name);
   if(!(target.active===0||target.active===false||target.active==='0')) throw new Error('target workflow unexpectedly active');
   if(workflows!==before.workflows+1) throw new Error(`workflow count mismatch expected=${before.workflows+1} actual=${workflows}`);
   if(credentials!==before.credentials) throw new Error(`credential count changed before=${before.credentials} after=${credentials}`);
   console.log(`[case003-verify] POST PASS workflows=${workflows} credentials=${credentials} target=${target.id} active=false`);
 }
 await close(db);
})().catch(e=>{console.error('[case003-verify] FAIL: '+(e.stack||e.message));process.exit(1);});
