#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');

const mode=process.argv[2];
if(!['pre','post'].includes(mode)){
  console.error('usage: verify-case003-gate2.js <pre|post>');
  process.exit(2);
}

const targetWorkflowId='case003DueDateEvaluationV1';
const targetCredentialId='case003RpcAuthV1';
const targetCredentialName='CASE003 Supabase RPC Token';
const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');
const checkpoint='/tmp/case003-gate2-pre.json';
const sha=s=>crypto.createHash('sha256').update(String(s??'')).digest('hex');

function openDb(){return new Promise((resolve,reject)=>{const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,e=>e?reject(e):resolve(db));});}
function all(db,sql,p=[]){return new Promise((resolve,reject)=>db.all(sql,p,(e,r)=>e?reject(e):resolve(r)));}
function get(db,sql,p=[]){return new Promise((resolve,reject)=>db.get(sql,p,(e,r)=>e?reject(e):resolve(r)));}
function close(db){return new Promise(resolve=>db.close(()=>resolve()));}

(async()=>{
  if(!fs.existsSync(dbPath)) throw new Error('n8n database missing: '+dbPath);
  const db=await openDb();
  const credentials=await all(db,'select id,name,type,data from credentials_entity order by id');
  const workflows=await all(db,'select id,name,active,nodes,connections from workflow_entity order by id');
  const targetWorkflow=workflows.find(w=>w.id===targetWorkflowId);
  const targetCredential=credentials.find(c=>c.id===targetCredentialId);

  if(mode==='pre'){
    const ew=parseInt(process.env.CASE003_GATE2_EXPECTED_WORKFLOWS||'10',10);
    const ec=parseInt(process.env.CASE003_GATE2_EXPECTED_CREDENTIALS||'4',10);
    if(workflows.length!==ew) throw new Error(`workflow baseline mismatch expected=${ew} actual=${workflows.length}`);
    if(credentials.length!==ec) throw new Error(`credential baseline mismatch expected=${ec} actual=${credentials.length}`);
    if(!targetWorkflow) throw new Error('CASE-003 workflow missing before Gate 2');
    if(!(targetWorkflow.active===0||targetWorkflow.active===false||targetWorkflow.active==='0')) throw new Error('CASE-003 workflow must be inactive before Gate 2');
    if(targetCredential) throw new Error('dedicated Gate-2 credential already exists; refusing upsert');

    const state={
      workflowCount:workflows.length,
      credentialCount:credentials.length,
      credentials:credentials.map(c=>({id:c.id,name:c.name,type:c.type,dataHash:sha(c.data)})),
      workflows:workflows.filter(w=>w.id!==targetWorkflowId).map(w=>({
        id:w.id,name:w.name,active:w.active,nodesHash:sha(w.nodes),connectionsHash:sha(w.connections)
      }))
    };
    fs.writeFileSync(checkpoint,JSON.stringify(state,null,2)+'\n',{mode:0o600});
    console.log(`[case003-gate2] PRE PASS workflows=${workflows.length} credentials=${credentials.length} targetCredential=absent targetWorkflow=inactive`);
  } else {
    if(!fs.existsSync(checkpoint)) throw new Error('Gate-2 pre checkpoint missing');
    const before=JSON.parse(fs.readFileSync(checkpoint,'utf8'));
    if(workflows.length!==before.workflowCount) throw new Error(`workflow count changed expected=${before.workflowCount} actual=${workflows.length}`);
    if(credentials.length!==before.credentialCount+1) throw new Error(`credential count mismatch expected=${before.credentialCount+1} actual=${credentials.length}`);

    for(const old of before.credentials){
      const now=credentials.find(c=>c.id===old.id);
      if(!now) throw new Error('existing credential disappeared: '+old.id);
      if(now.name!==old.name||now.type!==old.type||sha(now.data)!==old.dataHash) throw new Error('existing credential changed: '+old.id);
    }
    const created=credentials.find(c=>c.id===targetCredentialId);
    if(!created) throw new Error('dedicated Gate-2 credential missing');
    if(created.name!==targetCredentialName||created.type!=='httpHeaderAuth') throw new Error('dedicated Gate-2 credential metadata mismatch');

    for(const old of before.workflows){
      const now=workflows.find(w=>w.id===old.id);
      if(!now) throw new Error('existing workflow disappeared: '+old.id);
      if(now.name!==old.name||now.active!==old.active||sha(now.nodes)!==old.nodesHash||sha(now.connections)!==old.connectionsHash){
        throw new Error('non-CASE003 workflow changed: '+old.id);
      }
    }

    const wf=workflows.find(w=>w.id===targetWorkflowId);
    if(!wf) throw new Error('CASE-003 workflow missing after Gate 2');
    if(!(wf.active===0||wf.active===false||wf.active==='0')) throw new Error('CASE-003 workflow unexpectedly active after Gate 2');
    const nodes=JSON.parse(wf.nodes);
    const rpc=nodes.find(n=>n.id==='query-rpc');
    const bound=rpc?.credentials?.httpHeaderAuth;
    if(!rpc||bound?.id!==targetCredentialId) throw new Error('CASE-003 RPC node is not bound to dedicated credential');

    console.log(`[case003-gate2] POST PASS workflows=${workflows.length} credentials=${credentials.length} existingCredentials=unchanged existingWorkflows=unchanged CASE003=inactive boundCredential=${targetCredentialId}`);
  }
  await close(db);
})().catch(e=>{
  console.error('[case003-gate2] FAIL: '+(e.stack||e.message));
  process.exit(1);
});
