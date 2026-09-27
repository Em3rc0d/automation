#!/usr/bin/env node
'use strict';
const net=require('net');
const tls=require('tls');

function tcp(host,port,family){
  return new Promise(resolve=>{
    const s=net.createConnection({host,port,family});
    let done=false;
    const finish=(status,code)=>{if(done)return;done=true;try{s.destroy();}catch(_){} resolve({port,family,status,code:code||null});};
    s.setTimeout(5000);
    s.once('connect',()=>finish('CONNECTED',null));
    s.once('timeout',()=>finish('TIMEOUT','ETIMEDOUT'));
    s.once('error',e=>finish('ERROR',String(e.code||'ERROR')));
  });
}
function tlsProbe(host,port,family){
  return new Promise(resolve=>{
    const s=tls.connect({host,port,servername:host,rejectUnauthorized:true,family});
    let done=false;
    const finish=(status,code)=>{if(done)return;done=true;try{s.destroy();}catch(_){} resolve({port,family,status,code:code||null});};
    s.setTimeout(5000);
    s.once('secureConnect',()=>finish('CONNECTED',null));
    s.once('timeout',()=>finish('TIMEOUT','ETIMEDOUT'));
    s.once('error',e=>finish('ERROR',String(e.code||'ERROR')));
  });
}
const line=(host,r,tlsMode)=>console.log('[case003-smtp-probe] host='+host+' port='+r.port+' family=IPv'+r.family+' tls='+tlsMode+' status='+r.status+(r.code?' code='+r.code:''));

(async()=>{
  const gmail='smtp.gmail.com';
  line(gmail,await tlsProbe(gmail,465,4),true);
  line(gmail,await tcp(gmail,587,4),false);
  line(gmail,await tlsProbe(gmail,465,6),true);
  line(gmail,await tcp(gmail,587,6),false);

  const sendgrid='smtp.sendgrid.net';
  line(sendgrid,await tcp(sendgrid,2525,4),false);

  const brevo='smtp-relay.brevo.com';
  line(brevo,await tcp(brevo,2525,4),false);
})().catch(e=>{console.error('[case003-smtp-probe] FAIL '+String(e.code||e.message||'ERROR'));process.exit(1);});
