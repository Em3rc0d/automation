#!/usr/bin/env node
'use strict';
const fs=require('fs'),os=require('os'),path=require('path');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');

const mode=process.argv[2]||'render';
if(!['render','scrub'].includes(mode)) throw new Error('mode must be render or scrub');

const input='/opt/case002/case003-gate10-smtp-test.template.json';
const output='/tmp/case003-gate10-smtp-test.json';
function dbPath(){
  const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
  const configured=process.env.DB_SQLITE_DATABASE;
  return configured?(path.isAbsolute(configured)?configured:path.join(userFolder,'.n8n',configured)):path.join(userFolder,'.n8n','database.sqlite');
}
const all=(db,sql,p=[])=>new Promise((resolve,reject)=>db.all(sql,p,(e,r)=>e?reject(e):resolve(r||[])));
const mask=e=>{const [l,d]=e.split('@');return (l?.slice(0,1)||'*')+'***@'+d;};

(async()=>{
  const db=new sqlite3.Database(dbPath(),sqlite3.OPEN_READONLY);
  const creds=await all(db,'select id,name,type from credentials_entity order by id');
  await new Promise(resolve=>db.close(()=>resolve()));

  const smtp=creds.filter(c=>c.type==='smtp'&&c.name==='CASE003 SMTP OTP');
  if(smtp.length!==1) throw new Error('expected exactly one SMTP credential named CASE003 SMTP OTP');
  const rpc=creds.find(c=>c.id==='case003RpcAuthV1'&&c.type==='httpHeaderAuth');
  if(!rpc) throw new Error('CASE003 Supabase RPC credential missing');

  const supabaseUrl=String(process.env.CASE003_SUPABASE_URL||'').trim().replace(/\/$/,'');
  const publishableKey=String(process.env.CASE003_SUPABASE_PUBLISHABLE_KEY||'').trim();
  const realEmail=String(process.env.CASE003_TEST_EMAIL_OVERRIDE||'').trim().toLowerCase();
  const realRequest=String(process.env.CASE003_GATE10_REQUEST_ID||'').trim();
  if(!/^https:\/\//.test(supabaseUrl)) throw new Error('CASE003_SUPABASE_URL missing or invalid');
  if(!publishableKey) throw new Error('CASE003_SUPABASE_PUBLISHABLE_KEY missing');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(realEmail)) throw new Error('CASE003_TEST_EMAIL_OVERRIDE missing or invalid');
  if(!/^[0-9a-f-]{36}$/i.test(realRequest)) throw new Error('CASE003_GATE10_REQUEST_ID missing or invalid');

  const email=mode==='render'?realEmail:'disabled@example.invalid';
  const requestId=mode==='render'?realRequest:'00000000-0000-0000-0000-000000000000';
  const raw=fs.readFileSync(input,'utf8');
  const rendered=raw
    .split('__CASE003_SUPABASE_URL__').join(supabaseUrl)
    .split('__CASE003_SUPABASE_PUBLISHABLE_KEY__').join(publishableKey)
    .split('__CASE003_GATE10_REQUEST_ID__').join(requestId)
    .split('__CASE003_TEST_EMAIL_OVERRIDE__').join(email)
    .split('__CASE003_SMTP_CREDENTIAL_ID__').join(smtp[0].id)
    .split('__CASE003_SMTP_CREDENTIAL_NAME__').join(smtp[0].name);
  if(rendered.includes('__CASE003_')) throw new Error('unresolved CASE003 placeholder');

  const w=JSON.parse(rendered);
  for(const n of w.nodes||[]) if(typeof n.parameters?.jsCode==='string') new Function(n.parameters.jsCode);
  const smtpNode=w.nodes.find(n=>n.id==='send-email');
  if(smtpNode?.credentials?.smtp?.id!==smtp[0].id) throw new Error('SMTP binding mismatch');
  fs.writeFileSync(output,JSON.stringify(w,null,2)+'\n',{mode:0o600});
  console.log('[case003-gate10] '+mode.toUpperCase()+' PASS smtpCredentialId='+smtp[0].id+' destination='+mask(email));
})().catch(e=>{console.error('[case003-gate10] '+mode.toUpperCase()+' FAIL '+e.message);process.exit(1);});
