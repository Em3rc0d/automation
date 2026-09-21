#!/usr/bin/env node
'use strict';

const required=(name)=>{
  const v=String(process.env[name]||'').trim();
  if(!v) throw new Error(name+' is required');
  return v;
};
const mask=email=>{
  const [local,domain]=email.split('@');
  return (local?.slice(0,1)||'*')+'***@'+domain;
};
async function post(url,headers,body){
  const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  const t=await r.text();
  let j={}; try{j=t?JSON.parse(t):{};}catch{}
  if(!r.ok) throw new Error('HTTP '+r.status+' from '+url+' body='+t.slice(0,300));
  return j;
}
(async()=>{
  const supabase=required('CASE003_SUPABASE_URL').replace(/\/$/,'');
  const apikey=required('CASE003_SUPABASE_PUBLISHABLE_KEY');
  const token=required('CASE003_RPC_TOKEN');
  const requestId=required('CASE003_GATE10_REQUEST_ID');
  const overrideEmail=required('CASE003_TEST_EMAIL_OVERRIDE').toLowerCase();
  const resendKey=required('CASE003_RESEND_API_KEY');
  const from=String(process.env.CASE003_RESEND_FROM||'CASE-003 Test <onboarding@resend.dev>').trim();

  const rpcHeaders={
    'content-type':'application/json','accept':'application/json',
    'apikey':apikey,'x-case003-token':token
  };
  const prep=await post(
    supabase+'/rest/v1/rpc/case003_prepare_email_verification_test_override_json',
    rpcHeaders,
    {p_verification_request_id:requestId,p_override_email:overrideEmail,p_trace_id:'gate10-real-email-test'}
  );
  if(prep.decision!=='VERIFICATION_DELIVERY_REQUIRED'||!prep.delivery?.verification_code){
    throw new Error('unexpected prepare decision '+String(prep.decision));
  }

  const mail=await post(
    'https://api.resend.com/emails',
    {'content-type':'application/json','authorization':'Bearer '+resendKey},
    {
      from,to:[overrideEmail],
      subject:'CASE-003 — código de verificación',
      text:'Código de verificación: '+prep.delivery.verification_code+'\n\nFactura en prueba: 01-FM01-0096939\n\nEste código expira en aproximadamente 10 minutos. Responde por WhatsApp con: CODIGO <código>.'
    }
  );

  const mark=await post(
    supabase+'/rest/v1/rpc/case003_mark_verification_delivery_json',
    rpcHeaders,
    {p_delivery_id:prep.delivery_id,p_sent:true,p_provider:'resend',p_provider_message_id:String(mail.id||''),p_error_code:null,p_trace_id:'gate10-real-email-test'}
  );
  if(mark.decision!=='VERIFICATION_SENT') throw new Error('unexpected mark decision '+String(mark.decision));

  console.log('[case003-gate10] PASS email sent destination='+mask(overrideEmail)+' request='+requestId+' challenge='+prep.challenge_id);
})().catch(e=>{console.error('[case003-gate10] FAIL '+e.message);process.exit(1);});
