#!/usr/bin/env node
'use strict';
const fs=require('fs');
const token=process.env.CASE003_RPC_TOKEN;
if(!token||token.length<32) throw new Error('CASE003_RPC_TOKEN missing or too short');
const credential=[{id:'case003RpcAuthV1',name:'CASE003 Supabase RPC Token',type:'httpHeaderAuth',data:{name:'x-case003-token',value:token}}];
const out=process.argv[2]||'/tmp/case003-rpc-credential.json';
fs.writeFileSync(out,JSON.stringify(credential,null,2)+'\n',{mode:0o600});
console.log('[case003-gate2] prepared credential import file (secret not logged)');
