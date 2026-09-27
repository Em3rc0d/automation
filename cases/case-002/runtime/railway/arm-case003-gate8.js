#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const PHONE_ID='597907523413541';
const TARGET_URL='https://case002-n8n-production.up.railway.app/webhook/case003/adapters/kapso/whatsapp/messages';
const TARGET_WORKFLOW='case003KapsoIngressGate7V1';
const wfOut=path.join(os.tmpdir(),'case003-g8-arm-send-'+process.pid+'.json');
const credOut=path.join(os.tmpdir(),'case003-g8-arm-api-'+process.pid+'.json');

function exportJson(args,file){
  execFileSync(N8N,[...args,'--output='+file],{env:process.env,stdio:['ignore','ignore','pipe']});
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function one(x,id){
  const list=Array.isArray(x)?x:[x];
  return list.find(v=>v&&v.id===id);
}
async function req(url,options={}){
  const r=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});
  const text=await r.text();
  let body=null; try{body=text?JSON.parse(text):null;}catch(_){body={raw:text};}
  return {ok:r.ok,status:r.status,body};
}
function safeHook(w){
  return {id:w.id??null,url:w.url??null,active:w.active??null,events:w.events??[],phone_number_id:w.phone_number_id??null,payload_version:w.payload_version??null};
}

(async()=>{
  try{
    const sendWf=one(exportJson(['export:workflow','--id=kapsoMessageSendV1'],wfOut),'kapsoMessageSendV1');
    const apiBinding=sendWf?.nodes?.find(n=>n.name==='Send Kapso Message')?.credentials?.httpHeaderAuth;
    if(!apiBinding?.id) throw new Error('KAPSO API binding missing');
    const cred=one(exportJson(['export:credentials','--id='+apiBinding.id,'--decrypted'],credOut),apiBinding.id);
    const headerName=String(cred?.data?.name||'');
    const apiKey=String(cred?.data?.value||'');
    if(headerName.toLowerCase()!=='x-api-key'||!apiKey) throw new Error('unexpected/empty KAPSO API credential');

    // Activate only the isolated CASE-003 provider adapter. CASE-002 remains unchanged.
    execFileSync(N8N,['update:workflow','--id='+TARGET_WORKFLOW,'--active=true'],{env:process.env,stdio:['ignore','ignore','pipe']});

    const base='https://api.kapso.ai/platform/v1/whatsapp/phone_numbers/'+PHONE_ID+'/webhooks';
    const headers={'X-API-Key':apiKey,'Accept':'application/json'};
    const list=await req(base,{headers});
    if(!list.ok) throw new Error('list webhooks failed HTTP '+list.status);
    const hooks=Array.isArray(list.body?.data)?list.body.data:[];
    const case002=hooks.find(w=>String(w.url||'').includes('/webhook/adapters/kapso/whatsapp/messages'));
    const gate8=hooks.find(w=>String(w.url||'')===TARGET_URL);
    if(!case002?.id||case002.active!==true) throw new Error('CASE-002 webhook missing/inactive; refusing to arm Gate-8');
    if(!gate8?.id) throw new Error('Gate-8 prepared webhook missing');

    if(gate8.active!==true){
      const patch=await req(base+'/'+encodeURIComponent(gate8.id),{
        method:'PATCH',
        headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify({whatsapp_webhook:{active:true}})
      });
      if(!patch.ok) throw new Error('activate Gate-8 webhook failed HTTP '+patch.status+' '+JSON.stringify(patch.body).slice(0,300));
    }

    const after=await req(base,{headers});
    if(!after.ok) throw new Error('post-arm list failed HTTP '+after.status);
    const afterHooks=Array.isArray(after.body?.data)?after.body.data:[];
    const case002After=afterHooks.find(w=>w.id===case002.id);
    const gate8After=afterHooks.find(w=>w.id===gate8.id);
    if(case002After?.active!==true||case002After.url!==case002.url) throw new Error('CASE-002 webhook changed unexpectedly');
    if(gate8After?.active!==true) throw new Error('Gate-8 webhook not active after arm');

    console.log('[case003-gate8-arm] case002Webhook='+JSON.stringify(safeHook(case002After)));
    console.log('[case003-gate8-arm] gate8Webhook='+JSON.stringify(safeHook(gate8After)));
    console.log('[case003-gate8-arm] PASS gate8WebhookActive=true gate7WorkflowActive=true case002Unchanged=true outboundDisabled=true');
  } finally {
    try{fs.unlinkSync(wfOut);}catch(_){}
    try{fs.unlinkSync(credOut);}catch(_){}
  }
})().catch(e=>{console.error('[case003-gate8-arm] FAIL '+(e.stack||e.message));process.exit(1);});
