#!/usr/bin/env node
'use strict';

const path=require('path'), os=require('os');
const {createRequire}=require('module');
const req=createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3=req('sqlite3');

const userFolder=process.env.N8N_USER_FOLDER||os.homedir();
const n8nDir=path.join(userFolder,'.n8n');
const configured=process.env.DB_SQLITE_DATABASE;
const dbPath=configured?(path.isAbsolute(configured)?configured:path.join(n8nDir,configured)):path.join(n8nDir,'database.sqlite');

const db=new sqlite3.Database(dbPath,sqlite3.OPEN_READONLY,(err)=>{
  if(err){console.error('[case003-credentials] FAIL open '+err.message);process.exit(1);}
  db.all('SELECT id,name,type FROM credentials_entity ORDER BY type,name,id',[],(e,rows)=>{
    if(e){console.error('[case003-credentials] FAIL query '+e.message);db.close(()=>process.exit(1));return;}
    console.log('[case003-credentials] count='+rows.length);
    for(const r of rows){
      console.log('[case003-credentials] id='+r.id+' type='+r.type+' name='+JSON.stringify(r.name));
    }
    db.close();
  });
});
