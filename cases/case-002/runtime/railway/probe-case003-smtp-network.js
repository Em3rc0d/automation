#!/usr/bin/env node
'use strict';
const net=require('net');
const tls=require('tls');

function tcp(host,port){
  return new Promise(resolve=>{
    const s=net.createConnection({host,port});
    let done=false;
    const finish=(status,code)=>{if(done)return;done=true;try{s.destroy();}catch(_){} resolve({port,status,code:code||null});};
    s.setTimeout(5000);
    s.once('connect',()=>finish('CONNECTED',null));
    s.once('timeout',()=>finish('TIMEOUT','ETIMEDOUT'));
    s.once('error',e=>finish('ERROR',String(e.code||'ERROR')));
  });
}
function tlsProbe(host,port){
  return new Promise(resolve=>{
    const s=tls.connect({host,port,servername:host,rejectUnauthorized:true});
    let done=false;
    const finish=(status,code)=>{if(done)return;done=true;try{s.destroy();}catch(_){} resolve({port,status,code:code||null});};
    s.setTimeout(5000);
    s.once('secureConnect',()=>finish('CONNECTED',null));
    s.once('timeout',()=>finish('TIMEOUT','ETIMEDOUT'));
    s.once('error',e=>finish('ERROR',String(e.code||'ERROR')));
  });
}
(async()=>{
  const host='smtp.gmail.com';
  const r465=await tlsProbe(host,465);
  const r587=await tcp(host,587);
  console.log('[case003-smtp-probe] host=smtp.gmail.com port=465 tls=true status='+r465.status+(r465.code?' code='+r465.code:''));
  console.log('[case003-smtp-probe] host=smtp.gmail.com port=587 tls=false status='+r587.status+(r587.code?' code='+r587.code:''));
})().catch(e=>{console.error('[case003-smtp-probe] FAIL '+String(e.code||e.message||'ERROR'));process.exit(1);});
