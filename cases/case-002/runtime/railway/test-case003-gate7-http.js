#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const {execFileSync}=require('child_process');

const N8N='/usr/local/lib/node_modules/n8n/bin/n8n';
const base=String(process.env.CASE003_GATE7_BASE_URL||'http://127.0.0.1:5678').replace(/\/$/,'');
const url=base+'/webhook/case003/adapters/kapso/whatsapp/messages';
const suffix=String(process.env.RAILWAY_DEPLOYMENT_ID||Date.now()).replace(/[^A-Za-z0-9_-]/g,'').slice(-40);
const phoneId='999000111222333';
const knownSender='51999900001';
const unknownSender='51999900002';
const invoice='01-FM01-0096939';

function exportWorkflow(id,file){
  execFileSync(N8N,['export:workflow','--id='+id,'--output='+file],{env:process.env,stdio:['ignore','ignore','pipe']});
  const parsed=JSON.parse(fs.readFileSync(file,'utf8'));
  const list=Array.isArray(parsed)?parsed:[parsed];
  const w=list.find(x=>x&&x.id===id);
  if(!w) throw new Error('workflow export missing '+id);
  return w;
}

function loadHmacSecret(){
  const wfFile=path.join(os.tmpdir(),'gate7-source-'+process.pid+'.json');
  const credFile=path.join(os.tmpdir(),'gate7-hmac-'+process.pid+'.json');
  try{
    const w=exportWorkflow('kapsoMessageReceiveV1',wfFile);
    const credentialId=w.nodes.find(n=>n.name==='Calculate Kapso HMAC')?.credentials?.crypto?.id;
    if(!credentialId) throw new Error('live Kapso HMAC binding missing');
    execFileSync(N8N,['export:credentials','--id='+credentialId,'--decrypted','--output='+credFile],{env:process.env,stdio:['ignore','ignore','pipe']});
    const parsed=JSON.parse(fs.readFileSync(credFile,'utf8'));
    const list=Array.isArray(parsed)?parsed:[parsed];
    const c=list.find(x=>x&&x.id===credentialId);
    const secret=String(c?.data?.hmacSecret||'');
    if(!secret) throw new Error('Kapso HMAC secret missing');
    return secret;
  } finally {
    try{fs.unlinkSync(wfFile);}catch(_){}
    try{fs.unlinkSync(credFile);}catch(_){}
  }
}

const secret=loadHmacSecret();

function makePayload(messageId,sender,providerPhoneId=phoneId){
  const text='FACTURA '+invoice;
  return {
    data:{
      phone_number_id:providerPhoneId,
      conversation:{
        id:'gate7-conv-'+suffix,
        phone_number_id:providerPhoneId,
        phone_number:sender
      },
      message:{
        id:messageId,
        from:sender,
        timestamp:Math.floor(Date.now()/1000),
        type:'text',
        text:{body:text},
        kapso:{
          direction:'inbound',
          content:text,
          phone_number_id:providerPhoneId,
          whatsapp_conversation_id:'gate7-conv-'+suffix,
          contact_name:'Synthetic Gate7'
        }
      }
    }
  };
}

async function post(payload,eventId,signatureOverride){
  const raw=JSON.stringify(payload);
  const signature=signatureOverride??crypto.createHmac('sha256',secret).update(raw).digest('hex');
  const r=await fetch(url,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-webhook-event':'whatsapp.message.received',
      'x-webhook-payload-version':'v2',
      'x-idempotency-key':eventId,
      'x-webhook-signature':signature
    },
    body:raw,
    signal:AbortSignal.timeout(10000)
  });
  const text=await r.text();
  let body=null;
  try{body=text?JSON.parse(text):null;}catch(_){body={raw:text};}
  return {status:r.status,body};
}

(async()=>{
  const positivePayload=makePayload('wamid.gate7.'+suffix+'.1',knownSender);
  const first=await post(positivePayload,'evt-gate7-'+suffix+'-1');
  if(first.status!==200||first.body?.decision!=='FOUND') throw new Error('positive signed Kapso proof failed '+JSON.stringify(first));

  const replay=await post(positivePayload,'evt-gate7-'+suffix+'-1');
  if(replay.status!==200||replay.body?.decision!=='DUPLICATE') throw new Error('Kapso replay proof failed '+JSON.stringify(replay));

  const unknownPayload=makePayload('wamid.gate7.'+suffix+'.2',unknownSender);
  const unknown=await post(unknownPayload,'evt-gate7-'+suffix+'-2');
  if(unknown.status!==200||unknown.body?.decision!=='AUTH_REQUIRED') throw new Error('unknown sender proof failed '+JSON.stringify(unknown));

  const unboundPayload=makePayload('wamid.gate7.'+suffix+'.3',knownSender,'999000111222334');
  const unbound=await post(unboundPayload,'evt-gate7-'+suffix+'-3');
  if(unbound.status!==200||unbound.body?.decision!=='CONNECTOR_NOT_BOUND') throw new Error('connector binding proof failed '+JSON.stringify(unbound));

  const invalidPayload=makePayload('wamid.gate7.'+suffix+'.4',knownSender);
  const invalid=await post(invalidPayload,'evt-gate7-'+suffix+'-4','00'.repeat(32));
  if(invalid.status!==401||invalid.body?.code!=='KAPSO_WEBHOOK_REJECTED') throw new Error('invalid signature was not rejected '+JSON.stringify(invalid));

  console.log('[case003-gate7-http] PASS signed=FOUND replay=DUPLICATE unknown=AUTH_REQUIRED unbound=CONNECTOR_NOT_BOUND invalidSignature=401 outbound=disabled');
})().catch(e=>{console.error('[case003-gate7-http] FAIL '+(e.stack||e.message));process.exit(1);});
