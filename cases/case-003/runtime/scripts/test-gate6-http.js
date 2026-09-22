#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {execFileSync}=require('child_process');

const base=String(process.env.CASE003_GATE6_BASE_URL||'http://127.0.0.1:5678').replace(/\/$/,'');
const taxId=String(process.env.CASE003_GATE6_TAX_ID||'');
const hasTax=/^\d{8,20}$/.test(taxId);

function loadRpcToken(){
  const fromEnv=String(process.env.CASE003_RPC_TOKEN||'');
  if(fromEnv) return fromEnv;
  const out=path.join(os.tmpdir(),'case003-gate6-rpc-'+process.pid+'.json');
  try{
    execFileSync('/usr/local/lib/node_modules/n8n/bin/n8n',[
      'export:credentials','--id=case003RpcAuthV1','--decrypted','--output='+out
    ],{env:process.env,stdio:['ignore','ignore','pipe']});
    const parsed=JSON.parse(fs.readFileSync(out,'utf8'));
    const list=Array.isArray(parsed)?parsed:[parsed];
    const cred=list.find(x=>x&&x.id==='case003RpcAuthV1');
    if(String(cred?.data?.name||'').toLowerCase()!=='x-case003-token') throw new Error('CASE003 RPC credential header mismatch');
    const value=String(cred?.data?.value||'');
    if(!value) throw new Error('CASE003 RPC credential value empty');
    return value;
  }finally{try{fs.unlinkSync(out);}catch(_){}}
}
const token=loadRpcToken();
const url=base+'/webhook/case003/supplier-channel';

async function post(body){
  const r=await fetch(url,{
    method:'POST',
    headers:{'content-type':'application/json','x-case003-token':token},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(10000)
  });
  const text=await r.text();
  if(!r.ok) throw new Error('HTTP '+r.status+' '+text.slice(0,500));
  return text?JSON.parse(text):null;
}

const tenant=String(process.env.CASE003_GATE6_TENANT_ID||'');
const invoice=String(process.env.CASE003_GATE6_INVOICE_REFERENCE||'');
const known=String(process.env.CASE003_GATE6_VERIFIED_SUBJECT||'gate6-whatsapp-authorized-v1');
const unknown='gate6-whatsapp-http-unknown-v2';\nif(!tenant||!invoice) throw new Error('Gate-6 tenant/invoice config missing');

(async()=>{
  const positive=await post({
    tenant_id:tenant,channel:'whatsapp',subject:known,
    provider_message_id:'gate6-http-positive-v2',
    trace_id:'gate6-http-positive-v2',
    text:'FACTURA '+invoice
  });
  if(positive?.decision!=='FOUND'||positive.invoice_reference!==invoice||positive.channel_delivery!=='disabled'){
    throw new Error('positive Gate-6 HTTP proof failed');
  }

  const dup=await post({
    tenant_id:tenant,channel:'whatsapp',subject:known,
    provider_message_id:'gate6-http-positive-v2',
    trace_id:'gate6-http-duplicate-v2',
    text:'FACTURA '+invoice
  });
  if(dup?.decision!=='DUPLICATE'||dup.response_type!=='duplicate_ignored'){
    throw new Error('duplicate Gate-6 HTTP proof failed');
  }

  const auth=await post({
    tenant_id:tenant,channel:'whatsapp',subject:unknown,
    provider_message_id:'gate6-http-unknown-v2',
    trace_id:'gate6-http-unknown-v2',
    text:'FACTURA '+invoice
  });
  if(auth?.decision!=='AUTH_REQUIRED'||auth.next_action!=='provide_tax_id'||auth.invoice_reference!=null){
    throw new Error('unknown identity Gate-6 proof failed');
  }

  let verificationLabel='DB_CORE_ONLY';
  if(hasTax){
    const verification=await post({
      tenant_id:tenant,channel:'whatsapp',subject:unknown,
      provider_message_id:'gate6-http-ruc-v2',
      trace_id:'gate6-http-ruc-v2',
      text:'RUC '+taxId+' FACTURA '+invoice
    });
    if(verification?.decision!=='VERIFICATION_REQUIRED'||verification.next_action!=='verify_trusted_contact'||verification.delivery_status!=='disabled'||!verification.verification_request_id){
      throw new Error('verification-init Gate-6 proof failed');
    }
    const after=await post({
      tenant_id:tenant,channel:'whatsapp',subject:unknown,
      provider_message_id:'gate6-http-after-ruc-v2',
      trace_id:'gate6-http-after-ruc-v2',
      text:'FACTURA '+invoice
    });
    if(after?.decision!=='AUTH_REQUIRED'||after.invoice_reference!=null){
      throw new Error('RUC claim incorrectly auto-bound identity');
    }
    verificationLabel='VERIFICATION_REQUIRED';
  }

  console.log('[case003-gate6-http] PASS positive=FOUND duplicate=DUPLICATE unknown=AUTH_REQUIRED verification='+verificationLabel+' autoBind=false outbound=disabled');
})().catch(e=>{
  console.error('[case003-gate6-http] FAIL '+(e.stack||e.message));
  process.exit(1);
});
