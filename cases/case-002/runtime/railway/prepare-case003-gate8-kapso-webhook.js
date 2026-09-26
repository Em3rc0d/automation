#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const PHONE_ID='597907523413541';
const TARGET_URL='https://case002-n8n-production.up.railway.app/webhook/case003/adapters/kapso/whatsapp/messages';
const wfSendOut=path.join(os.tmpdir(),'case003-g8-send-'+process.pid+'.json');
const wfRecvOut=path.join(os.tmpdir(),'case003-g8-recv-'+process.pid+'.json');
const apiCredOut=path.join(os.tmpdir(),'case003-g8-api-'+process.pid+'.json');
const hmacCredOut=path.join(os.tmpdir(),'case003-g8-hmac-'+process.pid+'.json');

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
  return {
    id:w.id??null,url:w.url??null,kind:w.kind??null,
    events:Array.isArray(w.events)?w.events:[],
    active:w.active??null,phone_number_id:w.phone_number_id??null,
    buffer_enabled:w.buffer_enabled??null,payload_version:w.payload_version??null
  };
}

(async()=>{
  try{
    const sendWf=getOne(exportJson(['export:workflow','--id=kapsoMessageSendV1'],wfSendOut),'kapsoMessageSendV1');
    const recvWf=getOne(exportJson(['export:workflow','--id=kapsoMessageReceiveV1'],wfRecvOut),'kapsoMessageReceiveV1');
    if(!sendWf||!recvWf) throw new Error('required live Kapso workflows missing');

    const apiBinding=sendWf.nodes.find(n=>n.name==='Send Kapso Message')?.credentials?.httpHeaderAuth;
    const hmacBinding=recvWf.nodes.find(n=>n.name==='Calculate Kapso HMAC')?.credentials?.crypto;
    if(!apiBinding?.id) throw new Error('KAPSO API binding missing');
    if(!hmacBinding?.id) throw new Error('Kapso HMAC binding missing');

    const apiCred=getOne(exportJson(['export:credentials','--id='+apiBinding.id,'--decrypted'],apiCredOut),apiBinding.id);
    const hmacCred=getOne(exportJson(['export:credentials','--id='+hmacBinding.id,'--decrypted'],hmacCredOut),hmacBinding.id);
    const apiHeader=String(apiCred?.data?.name||'');
    const apiKey=String(apiCred?.data?.value||'');
    const hmacSecret=String(hmacCred?.data?.hmacSecret||'');
    if(apiHeader.toLowerCase()!=='x-api-key'||!apiKey) throw new Error('unexpected/empty KAPSO API credential');
    if(!hmacSecret) throw new Error('empty Kapso HMAC credential');

    const base='https://api.kapso.ai/platform/v1/whatsapp/phone_numbers/'+encodeURIComponent(PHONE_ID)+'/webhooks';
    const headers={'X-API-Key':apiKey,'Accept':'application/json'};
    const before=await request(base,{headers});
    if(!before.ok) throw new Error('list webhooks failed HTTP '+before.status);
    const beforeHooks=Array.isArray(before.body?.data)?before.body.data:[];
    const case002=beforeHooks.find(w=>String(w.url||'').includes('/webhook/adapters/kapso/whatsapp/messages'));
    const existing=beforeHooks.find(w=>String(w.url||'')===TARGET_URL);

    console.log('[case003-gate8-prepare] phone_number_id='+PHONE_ID+' existingWebhooks='+beforeHooks.length);
    if(case002) console.log('[case003-gate8-prepare] case002Webhook='+JSON.stringify(safeHook(case002)));

    let gate8=existing;
    let created=false;
    if(!gate8){
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
      if(!create.ok) throw new Error('create Gate-8 webhook failed HTTP '+create.status+' '+JSON.stringify(create.body).slice(0,500));
      gate8=create.body?.data;
      created=true;
    }

    const after=await request(base,{headers});
    if(!after.ok) throw new Error('post-create list webhooks failed HTTP '+after.status);
    const afterHooks=Array.isArray(after.body?.data)?after.body.data:[];
    const case002After=afterHooks.find(w=>w.id===case002?.id);
    const gate8After=afterHooks.find(w=>String(w.url||'')===TARGET_URL);
    if(!gate8After?.id) throw new Error('Gate-8 webhook not found after preparation');
    if(gate8After.active!==false) throw new Error('Gate-8 webhook must remain inactive during preparation');
    if(case002&&(!case002After||case002After.url!==case002.url||case002After.active!==case002.active)) throw new Error('CASE-002 webhook changed unexpectedly');

    console.log('[case003-gate8-prepare] gate8Webhook='+JSON.stringify(safeHook(gate8After))+' created='+created);
    console.log('[case003-gate8-prepare] PASS gate8Inactive=true case002Unchanged=true credentialPayloadsEdited=false');
  } finally {
    for(const f of [wfSendOut,wfRecvOut,apiCredOut,hmacCredOut]){try{fs.unlinkSync(f);}catch(_){}}
  }
})().catch(e=>{console.error('[case003-gate8-prepare] FAIL '+(e.stack||e.message));process.exit(1);});
