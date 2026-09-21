#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { createRequire } = require('module');

const req = createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3 = req('sqlite3');

const mode = process.argv[2];
if (!['pre','post'].includes(mode)) {
  console.error('usage: verify-case003-import.js <pre|post>');
  process.exit(2);
}

const targetId = 'case003DueDateEvaluationV1';
const targetName = 'CASE-003 Due Date Evaluation';
const userFolder = process.env.N8N_USER_FOLDER || os.homedir();
const n8nDir = path.join(userFolder, '.n8n');
const configuredDb = process.env.DB_SQLITE_DATABASE;
const dbPath = configuredDb
  ? (path.isAbsolute(configuredDb) ? configuredDb : path.join(n8nDir, configuredDb))
  : path.join(n8nDir, 'database.sqlite');
const checkpoint = '/tmp/case003-pre-import-state.json';

function openDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => err ? reject(err) : resolve(db));
  });
}
function get(db, sql, params=[]) {
  return new Promise((resolve,reject)=>db.get(sql,params,(err,row)=>err?reject(err):resolve(row)));
}
function close(db) { return new Promise(resolve=>db.close(()=>resolve())); }

(async()=>{
  if (!fs.existsSync(dbPath)) throw new Error(`n8n database missing: ${dbPath}`);
  const db = await openDb();
  const workflows = (await get(db,'SELECT COUNT(*) AS c FROM workflow_entity')).c;
  const credentials = (await get(db,'SELECT COUNT(*) AS c FROM credentials_entity')).c;
  const target = await get(db,'SELECT id,name,active FROM workflow_entity WHERE id=?',[targetId]);

  if (mode === 'pre') {
    if (target) throw new Error(`target workflow already exists: ${targetId}; refusing additive import`);
    const expectedWorkflows = Number.parseInt(process.env.CASE003_EXPECTED_PRE_WORKFLOWS || '9',10);
    const expectedCredentials = Number.parseInt(process.env.CASE003_EXPECTED_PRE_CREDENTIALS || '4',10);
    if (workflows !== expectedWorkflows) throw new Error(`workflow baseline mismatch: expected ${expectedWorkflows}, got ${workflows}`);
    if (credentials !== expectedCredentials) throw new Error(`credential baseline mismatch: expected ${expectedCredentials}, got ${credentials}`);
    fs.writeFileSync(checkpoint, JSON.stringify({workflows,credentials,targetId,targetName},null,2)+'\n',{mode:0o600});
    console.log(`[case003-verify] PRE PASS workflows=${workflows} credentials=${credentials} target=absent`);
  } else {
    if (!fs.existsSync(checkpoint)) throw new Error('pre-import checkpoint missing');
    const before = JSON.parse(fs.readFileSync(checkpoint,'utf8'));
    if (!target) throw new Error(`target workflow missing after import: ${targetId}`);
    if (target.name !== targetName) throw new Error(`target workflow name mismatch: ${target.name}`);
    if (!(target.active === 0 || target.active === false || target.active === '0')) throw new Error('target workflow unexpectedly active');
    if (workflows !== before.workflows + 1) throw new Error(`workflow count mismatch: expected ${before.workflows + 1}, got ${workflows}`);
    if (credentials !== before.credentials) throw new Error(`credential count changed: before ${before.credentials}, after ${credentials}`);
    console.log(`[case003-verify] POST PASS workflows=${workflows} credentials=${credentials} target=${target.id} active=false`);
  }
  await close(db);
})().catch(err=>{
  console.error(`[case003-verify] FAIL: ${err.stack || err.message}`);
  process.exit(1);
});
