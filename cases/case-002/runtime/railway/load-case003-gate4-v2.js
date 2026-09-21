#!/usr/bin/env node
'use strict';
const crypto=require('crypto');
const zlib=require('zlib');

const url=String(process.env.CASE003_SUPABASE_URL||'').replace(/\/$/,'');
const key=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'');
const token=String(process.env.CASE003_GATE4_IMPORT_TOKEN||'');
const bundleKey=String(process.env.CASE003_GATE4_BUNDLE_KEY_B64||'');
const count=Number(process.env.CASE003_GATE4_BUNDLE_PART_COUNT||0);
const expected=String(process.env.CASE003_GATE4_EXPECTED_SNAPSHOT_ID||'');
function fail(m){throw new Error('[case003-gate4] '+m);}
if(!/^https:\/\//.test(url)||!key||!token||!bundleKey) fail('runtime configuration incomplete');
if(!Number.isInteger(count)||count<1||count>20) fail('invalid bundle part count');

let text='';
for(let i=1;i<=count;i++){const p=process.env['CASE003_GATE4_BUNDLE_PART_'+i];if(!p) fail('missing bundle part '+i);text+=p;}
const env=JSON.parse(text);
if(env.v!==2||env.alg!=='AES-256-GCM'||env.compression!=='brotli') fail('unsupported bundle envelope');

const k=Buffer.from(bundleKey,'base64');
const iv=Buffer.from(env.iv,'base64');
const packed=Buffer.from(env.ciphertext,'base64');
const tag=packed.subarray(packed.length-16);
const body=packed.subarray(0,packed.length-16);
const decipher=crypto.createDecipheriv('aes-256-gcm',k,iv);
decipher.setAAD(Buffer.from(env.aad));
decipher.setAuthTag(tag);
const compressed=Buffer.concat([decipher.update(body),decipher.final()]);
const plain=zlib.brotliDecompressSync(compressed);
if(crypto.createHash('sha256').update(plain).digest('hex')!==env.sha256_plain) fail('bundle hash mismatch');

const bundle=JSON.parse(plain.toString('utf8'));
if(bundle.version!=='case003-gate4-v1') fail('bundle version mismatch');
if(expected&&bundle.snapshot_id!==expected) fail('snapshot mismatch');

async function ingest(kind,rows){
  let inserted=0;
  for(let i=0;i<rows.length;i+=200){
    const chunk=rows.slice(i,i+200);
    const res=await fetch(url+'/rest/v1/rpc/case003_gate4_ingest_batch',{
      method:'POST',
      headers:{apikey:key,'x-case003-import-token':token,'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({p_snapshot_id:bundle.snapshot_id,p_kind:kind,p_rows:chunk})
    });
    const bodyText=await res.text();
    if(!res.ok) fail(kind+' batch failed status='+res.status+' body='+bodyText.slice(0,300));
    inserted+=Number(JSON.parse(bodyText));
  }
  console.log('[case003-gate4] '+kind+' rows='+rows.length+' newlyInserted='+inserted);
}
(async()=>{
  for(const kind of ['import_file','supplier','invoice','financial_item','link','issue']){
    const rows=bundle.datasets?.[kind];
    if(!Array.isArray(rows)) fail('missing dataset '+kind);
    await ingest(kind,rows);
  }
  console.log('[case003-gate4] LOAD PASS snapshot='+bundle.snapshot_id);
})().catch(e=>{console.error(e.stack||e.message);process.exit(1);});
