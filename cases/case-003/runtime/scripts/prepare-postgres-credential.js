#!/usr/bin/env node
'use strict';
const fs=require('fs');

const host=process.env.CASE003_PG_HOST||'postgres';
const database=process.env.CASE003_PG_DATABASE||process.env.POSTGRES_DB;
const user=process.env.CASE003_PG_USER||process.env.POSTGRES_USER;
const password=process.env.CASE003_PG_PASSWORD||process.env.POSTGRES_PASSWORD;
const port=Number.parseInt(process.env.CASE003_PG_PORT||'5432',10);
const ssl=process.env.CASE003_PG_SSL||'disable';

if(!host||!database||!user||!password) throw new Error('CASE-003 PostgreSQL connection variables are incomplete');
if(!Number.isInteger(port)||port<1||port>65535) throw new Error('CASE003_PG_PORT invalid');
if(!['allow','disable','require'].includes(ssl)) throw new Error('CASE003_PG_SSL must be allow|disable|require');

const credential=[{
  id:'case003PostgresV1',
  name:'CASE003 PostgreSQL',
  type:'postgres',
  data:{
    host,database,user,password,port,
    maxConnections:5,
    allowUnauthorizedCerts:false,
    ssl
  }
}];

const out=process.argv[2]||'/tmp/case003-postgres-credential.json';
fs.writeFileSync(out,JSON.stringify(credential,null,2)+'\n',{mode:0o600});
console.log('[case003-gate2-pg] prepared PostgreSQL credential import file (secret not logged)');
