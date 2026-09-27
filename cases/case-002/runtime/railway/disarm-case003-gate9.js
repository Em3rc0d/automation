#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const PHONE_ID='597907523413541';
const TARGET_URL='https://case002-n8n-production.up.railway.app/webhook/case003/adapters/kapso/whatsapp/verification';
const TARGET_WORKFLOW='case003KapsoVerificationGate9V1';
const wfOut=path.join(os.tmpdir(),'case003-g9-disarm-send-'+process.pid+'.json');
const credOut=path.join(os.tmpdir(),'case003-g9-disarm-api-'+process.pid+'.json');

function exportJson(args,file){execFileSync(N8N,[...args,'--output='+file],{env:process.env,stdio:['ignore','ignore','pipe']});return JSON.parse(fs.readFileSync(file,'utf8'));}
function one(x,id){const list=Array.isArray(x)?x:[x];return list.find(v=>v&&v.id===id);}
async function req(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});const text=await r.text();let body=null;try{body=text?JSON.parse(text):null;}catch(_){body={raw:text};}return {ok:r.ok,status:r.status,body};}

(async()=>{
  try{
    const sendWf=one(exportJson(['export:workflow','--id=kapsoMessageSendV1'],wfOut),'kapsoMessageSendV1');
    const apiBinding=sendWf?.nodes?.find(n=>n.name==='Send Kapso Message')?.credentials?.httpHeaderAuth;
    if(!apiBinding?.id) throw new Error('KAPSO API binding missing');
    const cred=one(exportJson(['export:credentials','--id='+apiBinding.id,'--decrypted'],credOut),apiBinding.id);
    const apiKey=String(cred?.data?.value||'');
    if(String(cred?.data?.name||'').toLowerCase()!=='x-api-key'||!apiKey) throw new Error('unexpected/empty KAPSO API credential');

    const base='https://api.kapso.ai/platform/v1/whatsapp/phone_numbers/'+PHONE_ID+'/webhooks';
    const headers={'X-API-Key':apiKey,'Accept':'application/json'};
    const list=await req(base,{headers});
    if(!list.ok) throw new Error('list webhooks failed HTTP '+list.status);
    const hooks=Array.isArray(list.body?.data)?list.body.data:[];
    const case002=hooks.find(w=>String(w.url||'').includes('/webhook/adapters/kapso/whatsapp/messages'));
    const target=hooks.find(w=>String(w.url||'')===TARGET_URL);
    if(!case002?.id||case002.active!==true) throw new Error('CASE-002 webhook missing/inactive; refusing Gate-9 cleanup');
    if(!target?.id) throw new Error('Gate-9 webhook missing');

    if(target.active!==false){
      const patch=await req(base+'/'+encodeURIComponent(target.id),{
        method:'PATCH',headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify({whatsapp_webhook:{active:false}})
      });
      if(!patch.ok) throw new Error('deactivate Gate-9 webhook failed HTTP '+patch.status);
    }
    execFileSync(N8N,['update:workflow','--id='+TARGET_WORKFLOW,'--active=false'],{env:process.env,stdio:['ignore','ignore','pipe']});
    console.log('[case003-gate9-disarm] PASS gate9WebhookActive=false gate9WorkflowActive=false case002Unchanged=true');
  } finally {
    try{fs.unlinkSync(wfOut);}catch(_){}
    try{fs.unlinkSync(credOut);}catch(_){}
  }
})().catch(e=>{console.error('[case003-gate9-disarm] FAIL '+(e.stack||e.message));process.exit(1);});
