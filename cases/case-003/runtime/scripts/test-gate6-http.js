#!/usr/bin/env node
'use strict';
const base=String(process.env.CASE003_GATE6_BASE_URL||'http://127.0.0.1:5678').replace(/\/$/,'');
const token=String(process.env.CASE003_RPC_TOKEN||'');
const taxId=String(process.env.CASE003_GATE6_TAX_ID||'');
const tenant=String(process.env.CASE003_GATE6_TENANT_ID||'');
const invoice=String(process.env.CASE003_GATE6_INVOICE_REFERENCE||'');
if(!token) throw new Error('CASE003_RPC_TOKEN missing');
if(!/^\d{8,20}$/.test(taxId)) throw new Error('CASE003_GATE6_TAX_ID missing/invalid');
if(!tenant||!invoice) throw new Error('Gate-6 tenant/invoice config missing');
const url=base+'/webhook/case003/supplier-channel';

async function post(body){
 const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-case003-token':token},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const text=await r.text();
 if(!r.ok) throw new Error('HTTP '+r.status+' '+text.slice(0,500));
 return text?JSON.parse(text):null;
}
const known=String(process.env.CASE003_GATE6_VERIFIED_SUBJECT||'gate6-whatsapp-authorized-v1');
const unknown='gate6-whatsapp-http-unknown-v1';

(async()=>{
 const positive=await post({tenant_id:tenant,channel:'whatsapp',subject:known,provider_message_id:'gate6-http-positive-1',trace_id:'gate6-http-positive',text:'FACTURA '+invoice});
 if(positive?.decision!=='FOUND'||positive.invoice_reference!==invoice||positive.channel_delivery!=='disabled') throw new Error('positive proof failed');
 const dup=await post({tenant_id:tenant,channel:'whatsapp',subject:known,provider_message_id:'gate6-http-positive-1',trace_id:'gate6-http-duplicate',text:'FACTURA '+invoice});
 if(dup?.decision!=='DUPLICATE') throw new Error('duplicate proof failed');
 const auth=await post({tenant_id:tenant,channel:'whatsapp',subject:unknown,provider_message_id:'gate6-http-unknown-1',trace_id:'gate6-http-unknown',text:'FACTURA '+invoice});
 if(auth?.decision!=='AUTH_REQUIRED'||auth.next_action!=='provide_tax_id'||auth.invoice_reference!=null) throw new Error('unknown proof failed');
 let verificationLabel='DB_CORE_ONLY';
 if(hasTax){
   const verification=await post({tenant_id:tenant,channel:'whatsapp',subject:unknown,provider_message_id:'gate6-http-ruc-1',trace_id:'gate6-http-ruc',text:'RUC '+taxId+' FACTURA '+invoice});
   if(verification?.decision!=='VERIFICATION_REQUIRED'||verification.next_action!=='verify_trusted_contact'||verification.delivery_status!=='disabled'||!verification.verification_request_id) throw new Error('verification-init proof failed');
   const after=await post({tenant_id:tenant,channel:'whatsapp',subject:unknown,provider_message_id:'gate6-http-after-ruc-1',trace_id:'gate6-http-after-ruc',text:'FACTURA '+invoice});
   if(after?.decision!=='AUTH_REQUIRED'||after.invoice_reference!=null) throw new Error('RUC claim incorrectly auto-bound identity');
   verificationLabel='VERIFICATION_REQUIRED';
 }
 console.log('[case003-gate6-http] PASS positive=FOUND duplicate=DUPLICATE unknown=AUTH_REQUIRED verification='+verificationLabel+' outbound=disabled');
})().catch(e=>{console.error('[case003-gate6-http] FAIL '+(e.stack||e.message));process.exit(1);});
