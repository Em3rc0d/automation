#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const PHONE_ID='597907523413541';
const TARGET_URL='https://case002-n8n-production.up.railway.app/webhook/case003/adapters/kapso/whatsapp/verification';
const wfSendOut=path.join(os.tmpdir(),'case003-g9-send-'+process.pid+'.json');
const wfRecvOut=path.join(os.tmpdir(),'case003-g9-recv-'+process.pid+'.json');
const apiCredOut=path.join(os.tmpdir(),'case003-g9-api-'+process.pid+'.json');
const hmacCredOut=path.join(os.tmpdir(),'case003-g9-hmac-'+process.pid+'.json');

function exportJson(args,file){
  execFileSync(N8N,[...args,'--output='+file],{env:process.env,stdio:['ignore','ignore','pipe']});
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function getOne(x,id){
  const list=Array.isArray(x)?x:[x];
  return list.find(v=>v&&v.id===id);
}
async function request(url,options={}){
  const r=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});
  const text=await r.text();
  let body=null; try{body=text?JSON.parse(text):null;}catch(_){body={raw:text};}
  return {status:r.status,ok:r.ok,body};
}
function safeHook(w){
  return {id:w.id??null,url:w.url??null,events:Array.isArray(w.events)?w.events:[],active:w.active??null,phone_number_id:w.phone_number_id??null,payload_version:w.payload_version??null};
}

(async()=>{
  try{
    const sendWf=getOne(exportJson(['export:workflow','--id=kapsoMessageSendV1'],wfSendOut),'kapsoMessageSendV1');
    const recvWf=getOne(exportJson(['export:workflow','--id=kapsoMessageReceiveV1'],wfRecvOut),'kapsoMessageReceiveV1');
    if(!sendWf||!recvWf) throw new Error('required live Kapso workflows missing');

    const apiBinding=sendWf.nodes.find(n=>n.name==='Send Kapso Message')?.credentials?.httpHeaderAuth;
    const hmacBinding=recvWf.nodes.find(n=>n.name==='Calculate Kapso HMAC')?.credentials?.crypto;
    if(!apiBinding?.id||!hmacBinding?.id) throw new Error('Kapso credential binding missing');

    const apiCred=getOne(exportJson(['export:credentials','--id='+apiBinding.id,'--decrypted'],apiCredOut),apiBinding.id);
    const hmacCred=getOne(exportJson(['export:credentials','--id='+hmacBinding.id,'--decrypted'],hmacCredOut),hmacBinding.id);
    const apiHeader=String(apiCred?.data?.name||'');
    const apiKey=String(apiCred?.data?.value||'');
    const hmacSecret=String(hmacCred?.data?.hmacSecret||'');
    if(apiHeader.toLowerCase()!=='x-api-key'||!apiKey||!hmacSecret) throw new Error('Kapso credential material unavailable');

    const base='https://api.kapso.ai/platform/v1/whatsapp/phone_numbers/'+encodeURIComponent(PHONE_ID)+'/webhooks';
    const headers={'X-API-Key':apiKey,'Accept':'application/json'};
    const before=await request(base,{headers});
    if(!before.ok) throw new Error('list webhooks failed HTTP '+before.status);
    const hooks=Array.isArray(before.body?.data)?before.body.data:[];
    const case002=hooks.find(w=>String(w.url||'').includes('/webhook/adapters/kapso/whatsapp/messages'));
    const existing=hooks.find(w=>String(w.url||'')===TARGET_URL);
    if(!case002?.id||case002.active!==true) throw new Error('CASE-002 webhook missing/inactive; refusing Gate-9 preparation');

    let target=existing;
    let created=false;
    if(!target){
      const payload={whatsapp_webhook:{
        url:TARGET_URL,
        secret_key:hmacSecret,
        events:['whatsapp.message.received'],
        active:false,
        buffer_enabled:false,
        payload_version:'v2'
      }};
      let create=await request(base,{
        method:'POST',
        headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      if(!create.ok&&create.status===422){
        delete payload.whatsapp_webhook.buffer_enabled;
        delete payload.whatsapp_webhook.payload_version;
        create=await request(base,{
          method:'POST',
          headers:{...headers,'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        });
      }
      if(!create.ok) throw new Error('create Gate-9 webhook failed HTTP '+create.status+' '+JSON.stringify(create.body).slice(0,400));
      target=create.body?.data;
      created=true;
    }

    const after=await request(base,{headers});
    if(!after.ok) throw new Error('post-create list webhooks failed HTTP '+after.status);
    const afterHooks=Array.isArray(after.body?.data)?after.body.data:[];
    const case002After=afterHooks.find(w=>w.id===case002.id);
    const gate9After=afterHooks.find(w=>String(w.url||'')===TARGET_URL);
    if(!gate9After?.id) throw new Error('Gate-9 webhook missing after preparation');
    if(gate9After.active!==false) throw new Error('Gate-9 webhook must remain inactive');
    if(!case002After||case002After.url!==case002.url||case002After.active!==true) throw new Error('CASE-002 webhook changed unexpectedly');

    console.log('[case003-gate9-webhook] case002Webhook='+JSON.stringify(safeHook(case002After)));
    console.log('[case003-gate9-webhook] gate9Webhook='+JSON.stringify(safeHook(gate9After))+' created='+created);
    console.log('[case003-gate9-webhook] PASS gate9Inactive=true case002Unchanged=true credentialPayloadsEdited=false');
  } finally {
    for(const f of [wfSendOut,wfRecvOut,apiCredOut,hmacCredOut]){try{fs.unlinkSync(f);}catch(_){}}
  }
})().catch(e=>{console.error('[case003-gate9-webhook] FAIL '+(e.stack||e.message));process.exit(1);});
