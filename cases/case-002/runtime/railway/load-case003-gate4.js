#!/usr/bin/env node
'use strict';

const crypto=require('crypto');
const zlib=require('zlib');

const SUPABASE_URL=String(process.env.CASE003_SUPABASE_URL||'').replace(/\/$/,'');
const PUBLISHABLE_KEY=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'');
const IMPORT_TOKEN=String(process.env.CASE003_GATE4_IMPORT_TOKEN||'');
const KEY_B64=String(process.env.CASE003_GATE4_BUNDLE_KEY_B64||'');
const PART_COUNT=Number(process.env.CASE003_GATE4_BUNDLE_PART_COUNT||0);
const EXPECTED_SNAPSHOT=String(process.env.CASE003_GATE4_EXPECTED_SNAPSHOT_ID||'');

function fail(m){throw new Error('[case003-gate4] '+m);}
if(!/^https:\/\//.test(SUPABASE_URL)) fail('CASE003_SUPABASE_URL missing/invalid');
if(!PUBLISHABLE_KEY) fail('CASE003_SUPABASE_PUBLISHABLE_KEY missing');
if(!IMPORT_TOKEN) fail('CASE003_GATE4_IMPORT_TOKEN missing');
if(!KEY_B64) fail('CASE003_GATE4_BUNDLE_KEY_B64 missing');
if(!Number.isInteger(PART_COUNT)||PART_COUNT<1||PART_COUNT>20) fail('invalid bundle part count');

let envelopeText='';
for(let i=1;i<=PART_COUNT;i++){
  const p=process.env['CASE003_GATE4_BUNDLE_PART_'+i];
  if(!p) fail('missing bundle part '+i);
  envelopeText+=p;
}
const env=JSON.parse(envelopeText);
if(env.v!==1||env.alg!=='AES-256-GCM'||env.compression!=='gzip') fail('unsupported bundle envelope');
const key=Buffer.from(KEY_B64,'base64');
if(key.length!==32) fail('bundle key must be 32 bytes');
const iv=Buffer.from(env.iv,'base64');
const packed=Buffer.from(env.ciphertext,'base64');
if(packed.length<17) fail('ciphertext too short');
const tag=packed.subarray(packed.length-16);
const body=packed.subarray(0,packed.length-16);
const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);
decipher.setAAD(Buffer.from(env.aad||'case003-gate4-v1'));
decipher.setAuthTag(tag);
const gz=Buffer.concat([decipher.update(body),decipher.final()]);
const plain=zlib.gunzipSync(gz);
const hash=crypto.createHash('sha256').update(plain).digest('hex');
if(hash!==env.sha256_plain) fail('bundle plaintext hash mismatch');
const bundle=JSON.parse(plain.toString('utf8'));
if(bundle.version!=='case003-gate4-v1') fail('bundle version mismatch');
if(EXPECTED_SNAPSHOT && bundle.snapshot_id!==EXPECTED_SNAPSHOT) fail('snapshot ID mismatch');

async function ingest(kind,rows){
  let total=0;
  for(let i=0;i<rows.length;i+=200){
    const chunk=rows.slice(i,i+200);
    const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/case003_gate4_ingest_batch',{
      method:'POST',
      headers:{
        'apikey':PUBLISHABLE_KEY,
        'x-case003-import-token':IMPORT_TOKEN,
        'Content-Type':'application/json',
        'Accept':'application/json'
      },
      body:JSON.stringify({p_snapshot_id:bundle.snapshot_id,p_kind:kind,p_rows:chunk})
    });
    const text=await res.text();
    if(!res.ok) fail('ingest '+kind+' batch failed status='+res.status+' body='+text.slice(0,500));
    const n=Number(JSON.parse(text));
    if(!Number.isFinite(n)) fail('invalid ingest count for '+kind);
    total+=n;
  }
  console.log('[case003-gate4] '+kind+' rows='+rows.length+' newlyInserted='+total);
}

(async()=>{
  const order=['import_file','supplier','invoice','financial_item','link','issue'];
  for(const kind of order){
    const rows=bundle.datasets?.[kind];
    if(!Array.isArray(rows)) fail('missing dataset '+kind);
    await ingest(kind,rows);
  }
  console.log('[case003-gate4] LOAD PASS snapshot='+bundle.snapshot_id+' tenant='+bundle.tenant_id);
})().catch(e=>{console.error(e.stack||e.message);process.exit(1);});
