#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const wfOut=path.join(os.tmpdir(),'case003-kapso-send-'+process.pid+'.json');
const credOut=path.join(os.tmpdir(),'case003-kapso-api-'+process.pid+'.json');

function exportJson(args,file){
  execFileSync(N8N,[...args,'--output='+file],{env:process.env,stdio:['ignore','ignore','pipe']});
  return JSON.parse(fs.readFileSync(file,'utf8'));
}
function one(x,id){
  const list=Array.isArray(x)?x:[x];
  return list.find(v=>v&&v.id===id);
}
function sanitizeWebhook(w){
  return {
    id:w.id??null,
    url:w.url??null,
    kind:w.kind??null,
    events:Array.isArray(w.events)?w.events:[],
    active:w.active??null,
    phone_number_id:w.phone_number_id??null,
    buffer_enabled:w.buffer_enabled??null,
    buffer_window_seconds:w.buffer_window_seconds??null,
    max_buffer_size:w.max_buffer_size??null,
    buffer_events:Array.isArray(w.buffer_events)?w.buffer_events:[],
    inactivity_minutes:w.inactivity_minutes??null,
    payload_version:w.payload_version??null
  };
}
(async()=>{
  try{
    const wf=one(exportJson(['export:workflow','--id=kapsoMessageSendV1'],wfOut),'kapsoMessageSendV1');
    if(!wf) throw new Error('kapsoMessageSendV1 export missing');
    const send=wf.nodes.find(n=>n.name==='Send Kapso Message');
    const binding=send?.credentials?.httpHeaderAuth;
    if(!binding?.id) throw new Error('KAPSO API credential binding missing on live send workflow');

    const cred=one(exportJson(['export:credentials','--id='+binding.id,'--decrypted'],credOut),binding.id);
    if(!cred) throw new Error('KAPSO API credential export missing');
    const headerName=String(cred?.data?.name||'');
    const apiKey=String(cred?.data?.value||'');
    if(!apiKey) throw new Error('KAPSO API credential value empty');
    if(headerName.toLowerCase()!=='x-api-key') throw new Error('unexpected Kapso API header name: '+headerName);

    const headers={'X-API-Key':apiKey,'Accept':'application/json'};
    const listRes=await fetch('https://api.kapso.ai/platform/v1/whatsapp/phone_numbers',{headers,signal:AbortSignal.timeout(10000)});
    const listText=await listRes.text();
    if(!listRes.ok) throw new Error('Kapso phone-number discovery HTTP '+listRes.status+' '+listText.slice(0,300));
    const list=JSON.parse(listText);
    const phones=Array.isArray(list?.data)?list.data:[];

    console.log('[case003-kapso-discovery] credentialId='+binding.id+' credentialName='+binding.name+' credentialType=httpHeaderAuth');
    console.log('[case003-kapso-discovery] phoneCount='+phones.length);

    for(const p of phones){
      const phoneId=String(p.phone_number_id||p.id||'');
      const safePhone={
        phone_number_id:phoneId,
        name:p.name??null,
        display_name:p.display_name??null,
        display_phone_number:p.display_phone_number??null,
        display_phone_number_normalized:p.display_phone_number_normalized??null,
        verified_name:p.verified_name??null,
        status:p.status??null,
        inbound_processing_enabled:p.inbound_processing_enabled??null,
        webhook_verified_at:p.webhook_verified_at??null,
        quality_rating:p.quality_rating??null,
        customer_id:p.customer_id??null
      };
      console.log('[case003-kapso-discovery] phone='+JSON.stringify(safePhone));

      if(!phoneId) continue;
      const hookRes=await fetch('https://api.kapso.ai/platform/v1/whatsapp/phone_numbers/'+encodeURIComponent(phoneId)+'/webhooks',{headers,signal:AbortSignal.timeout(10000)});
      const hookText=await hookRes.text();
      if(!hookRes.ok){
        console.log('[case003-kapso-discovery] webhooks phone_number_id='+phoneId+' http='+hookRes.status);
        continue;
      }
      const hooks=JSON.parse(hookText);
      const safeHooks=(Array.isArray(hooks?.data)?hooks.data:[]).map(sanitizeWebhook);
      console.log('[case003-kapso-discovery] webhooks phone_number_id='+phoneId+' data='+JSON.stringify(safeHooks));
    }
    console.log('[case003-kapso-discovery] PASS readOnly=true secretsLogged=false mutations=0');
  } finally {
    try{fs.unlinkSync(wfOut);}catch(_){}
    try{fs.unlinkSync(credOut);}catch(_){}
  }
})().catch(e=>{console.error('[case003-kapso-discovery] FAIL '+(e.stack||e.message));process.exit(1);});
