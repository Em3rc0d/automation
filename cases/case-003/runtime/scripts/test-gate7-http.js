#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const {execFileSync}=require('child_process');
const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const base=String(process.env.CASE003_GATE7_BASE_URL||'http://127.0.0.1:5678').replace(/\/$/,'');
const url=base+'/webhook/case003/adapters/kapso/whatsapp/messages';
const suffix=String(process.env.CASE003_GATE7_TEST_SUFFIX||Date.now()).replace(/[^A-Za-z0-9_-]/g,'').slice(-40);
const phoneId=String(process.env.CASE003_GATE7_PHONE_NUMBER_ID||'999000111222333');
const knownSender=String(process.env.CASE003_GATE7_VERIFIED_SENDER||'51999900001');
const unknownSender=String(process.env.CASE003_GATE7_UNKNOWN_SENDER||'51999900002');
const invoice=String(process.env.CASE003_GATE7_INVOICE_REFERENCE||'F001-100');
const hmacId=String(process.env.CASE003_KAPSO_HMAC_CREDENTIAL_ID||'');

function loadSecret(){
  const envSecret=String(process.env.CASE003_KAPSO_WEBHOOK_SECRET||'');
  if(envSecret) return envSecret;
  if(!hmacId) throw new Error('CASE003_KAPSO_HMAC_CREDENTIAL_ID or CASE003_KAPSO_WEBHOOK_SECRET required');
  const out=path.join(os.tmpdir(),'case003-gate7-hmac-'+process.pid+'.json');
  try{
    execFileSync(N8N,['export:credentials','--id='+hmacId,'--decrypted','--output='+out],{env:process.env,stdio:['ignore','ignore','pipe']});
    const parsed=JSON.parse(fs.readFileSync(out,'utf8'));
    const list=Array.isArray(parsed)?parsed:[parsed];
    const cred=list.find(x=>x&&x.id===hmacId);
    const secret=String(cred?.data?.hmacSecret||'');
    if(!secret) throw new Error('Gate-7 HMAC credential has empty hmacSecret');
    return secret;
  } finally { try{fs.unlinkSync(out);}catch(_){} }
}
const secret=loadSecret();

function payload(messageId,sender,providerPhoneId=phoneId){
  const text='FACTURA '+invoice;
  return {data:{
    phone_number_id:providerPhoneId,
    conversation:{id:'gate7-conv-'+suffix,phone_number_id:providerPhoneId,phone_number:sender},
    message:{
      id:messageId,from:sender,timestamp:Math.floor(Date.now()/1000),type:'text',
      text:{body:text},
      kapso:{direction:'inbound',content:text,phone_number_id:providerPhoneId,whatsapp_conversation_id:'gate7-conv-'+suffix,contact_name:'Synthetic Gate7'}
    }
  }};
}
async function post(p,eventId,signatureOverride){
  const raw=JSON.stringify(p);
  const signature=signatureOverride??crypto.createHmac('sha256',secret).update(raw).digest('hex');
  const r=await fetch(url,{method:'POST',headers:{
    'content-type':'application/json',
    'x-webhook-event':'whatsapp.message.received',
    'x-webhook-payload-version':'v2',
    'x-idempotency-key':eventId,
    'x-webhook-signature':signature
  },body:raw,signal:AbortSignal.timeout(10000)});
  const text=await r.text();
  let body=null; try{body=text?JSON.parse(text):null;}catch(_){body={raw:text};}
  return {status:r.status,body};
}
(async()=>{
  const firstPayload=payload('wamid.gate7.'+suffix+'.1',knownSender);
  const first=await post(firstPayload,'evt-gate7-'+suffix+'-1');
  if(first.status!==200||first.body?.decision!=='FOUND') throw new Error('positive proof failed '+JSON.stringify(first));
  const replay=await post(firstPayload,'evt-gate7-'+suffix+'-1');
  if(replay.status!==200||replay.body?.decision!=='DUPLICATE') throw new Error('replay proof failed '+JSON.stringify(replay));
  const unknown=await post(payload('wamid.gate7.'+suffix+'.2',unknownSender),'evt-gate7-'+suffix+'-2');
  if(unknown.status!==200||unknown.body?.decision!=='AUTH_REQUIRED') throw new Error('unknown sender proof failed '+JSON.stringify(unknown));
  const unbound=await post(payload('wamid.gate7.'+suffix+'.3',knownSender,phoneId+'9'),'evt-gate7-'+suffix+'-3');
  if(unbound.status!==200||unbound.body?.decision!=='CONNECTOR_NOT_BOUND') throw new Error('unbound connector proof failed '+JSON.stringify(unbound));
  const invalid=await post(payload('wamid.gate7.'+suffix+'.4',knownSender),'evt-gate7-'+suffix+'-4','00'.repeat(32));
  if(invalid.status!==401||invalid.body?.code!=='KAPSO_WEBHOOK_REJECTED') throw new Error('signature rejection failed '+JSON.stringify(invalid));
  console.log('[case003-gate7-http] PASS signed=FOUND replay=DUPLICATE unknown=AUTH_REQUIRED unbound=CONNECTOR_NOT_BOUND invalidSignature=401 outbound=disabled');
})().catch(e=>{console.error('[case003-gate7-http] FAIL '+(e.stack||e.message));process.exit(1);});
