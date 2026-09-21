#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const zlib=require('zlib');

const PAYLOAD_DIR='/opt/case002/gate4-payload';
const keyB64=String(process.env.CASE003_GATE4_KEY_B64||'');
const baseUrl=String(process.env.CASE003_SUPABASE_URL||'').replace(/\/$/,'');
const apiKey=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'');
const rpcToken=String(process.env.CASE003_RPC_TOKEN||'');

function fail(m){throw new Error(m);}
async function rpc(name,body){
  const res=await fetch(baseUrl+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{
      apikey:apiKey,
      'x-case003-token':rpcToken,
      'Content-Type':'application/json',
      Accept:'application/json'
    },
    body:JSON.stringify(body)
  });
  const text=await res.text();
  if(!res.ok) fail(name+' HTTP '+res.status+' '+text.slice(0,500));
  return text?JSON.parse(text):null;
}

function loadBundle(){
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(keyB64)) fail('CASE003_GATE4_KEY_B64 missing/invalid');
  const files=fs.readdirSync(PAYLOAD_DIR).filter(x=>/^part-\d+\.txt$/.test(x)).sort();
  if(files.length<1) fail('encrypted Gate-4 payload parts missing');
  const outerB64=files.map(f=>fs.readFileSync(path.join(PAYLOAD_DIR,f),'utf8').trim()).join('');
  const envelope=JSON.parse(Buffer.from(outerB64,'base64').toString('utf8'));
  if(envelope.v!==4||envelope.alg!=='AES-256-GCM'||envelope.compression!=='brotli') fail('unsupported Gate-4 envelope');
  const key=Buffer.from(keyB64,'base64');
  if(key.length!==32) fail('Gate-4 key must be 32 bytes');
  const iv=Buffer.from(envelope.iv,'base64');
  const combined=Buffer.from(envelope.ciphertext,'base64');
  const tag=combined.subarray(combined.length-16);
  const ciphertext=combined.subarray(0,combined.length-16);
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAAD(Buffer.from(envelope.aad,'utf8'));
  decipher.setAuthTag(tag);
  const compressed=Buffer.concat([decipher.update(ciphertext),decipher.final()]);
  const raw=zlib.brotliDecompressSync(compressed);
  return JSON.parse(raw.toString('utf8'));
}

(async()=>{
  if(!/^https:\/\//.test(baseUrl)) fail('CASE003_SUPABASE_URL missing/invalid');
  if(!apiKey) fail('CASE003_SUPABASE_PUBLISHABLE_KEY missing');
  if(!rpcToken) fail('CASE003_RPC_TOKEN missing');

  const bundle=loadBundle();
  if(bundle.caseId!=='CASE-003'||bundle.version!==3) fail('bundle identity mismatch');
  if(!bundle.snapshotId||!bundle.tenantId||!Array.isArray(bundle.payloads)) fail('bundle shape invalid');

  console.log('[case003-gate4] BEGIN snapshot='+bundle.snapshotId+' payloadChunks='+bundle.payloads.length);
  await rpc('case003_gate4_begin',{
    p_snapshot_id:bundle.snapshotId,
    p_tenant_id:bundle.tenantId,
    p_expected_counts:bundle.expectedCounts
  });

  const totals={};
  for(const p of bundle.payloads){
    if(p.p_snapshot_id!==bundle.snapshotId||!p.p_kind||!Array.isArray(p.p_rows)) fail('payload chunk mismatch');
    const inserted=await rpc('case003_gate4_ingest',{
      p_snapshot_id:bundle.snapshotId,
      p_kind:p.p_kind,
      p_rows:p.p_rows
    });
    totals[p.p_kind]=(totals[p.p_kind]||0)+Number(inserted||0);
    console.log('[case003-gate4] ingested kind='+p.p_kind+' chunkRows='+p.p_rows.length+' inserted='+inserted);
  }

  const published=await rpc('case003_gate4_publish',{p_snapshot_id:bundle.snapshotId});
  console.log('[case003-gate4] PUBLISH PASS snapshot='+bundle.snapshotId+' totals='+JSON.stringify(totals));
  console.log('[case003-gate4] result='+JSON.stringify(published));
})().catch(e=>{
  console.error('[case003-gate4] FAIL '+(e.stack||e.message));
  process.exit(1);
});
