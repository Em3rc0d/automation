#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { createRequire } = require('module');

const req = createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3 = req('sqlite3');

const label = (process.argv[2] || 'startup').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64);
const userFolder = process.env.N8N_USER_FOLDER || os.homedir();
const n8nDir = path.join(userFolder, '.n8n');
const configuredDb = process.env.DB_SQLITE_DATABASE;
const dbPath = configuredDb
  ? (path.isAbsolute(configuredDb) ? configuredDb : path.join(n8nDir, configuredDb))
  : path.join(n8nDir, 'database.sqlite');
const backupRoot = process.env.CASE002_BACKUP_DIR || path.join(n8nDir, 'backups');
const retention = Math.max(3, Number.parseInt(process.env.CASE002_BACKUP_RETENTION || '20', 10) || 20);
const required = String(process.env.CASE002_BACKUP_REQUIRED || 'true').toLowerCase() !== 'false';

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function sha256(file) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}

function openDb(file, mode) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, mode, (err) => err ? reject(err) : resolve(db));
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
  });
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => err ? reject(err) : resolve());
  });
}

function close(db) {
  return new Promise((resolve) => db.close(() => resolve()));
}

async function tableCount(db, table) {
  const exists = await get(
    db,
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name=?",
    [table],
  );
  if (!exists || exists.c === 0) return null;
  const row = await get(db, `SELECT COUNT(*) AS c FROM "${table}"`);
  return row ? row.c : null;
}

function pruneOldBackups() {
  if (!fs.existsSync(backupRoot)) return;
  const dirs = fs.readdirSync(backupRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('snapshot-'))
    .map((d) => ({
      name: d.name,
      full: path.join(backupRoot, d.name),
      mtimeMs: fs.statSync(path.join(backupRoot, d.name)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const old of dirs.slice(retention)) {
    fs.rmSync(old.full, { recursive: true, force: true });
    console.log(`[case002-backup] pruned ${old.full}`);
  }
}

(async () => {
  if (!fs.existsSync(dbPath)) {
    console.log(`[case002-backup] no database at ${dbPath}; nothing to back up`);
    process.exit(0);
  }

  fs.mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
  const dir = path.join(backupRoot, `snapshot-${stamp()}-${label}`);
  fs.mkdirSync(dir, { recursive: false, mode: 0o700 });

  const backupDb = path.join(dir, 'database.sqlite');
  const db = await openDb(dbPath, sqlite3.OPEN_READWRITE);

  const counts = {};
  for (const table of [
    'workflow_entity',
    'workflow_history',
    'shared_workflow',
    'execution_entity',
    'credentials_entity',
    'project',
    'project_relation',
    'user',
  ]) {
    counts[table] = await tableCount(db, table);
  }

  const escaped = backupDb.replace(/'/g, "''");
  await exec(db, `VACUUM INTO '${escaped}'`);
  await close(db);

  fs.chmodSync(backupDb, 0o600);

  const configPath = path.join(n8nDir, 'config');
  let configCopied = false;
  if (fs.existsSync(configPath) && fs.statSync(configPath).isFile()) {
    const target = path.join(dir, 'config');
    fs.copyFileSync(configPath, target);
    fs.chmodSync(target, 0o600);
    configCopied = true;
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    label,
    sourceDatabase: dbPath,
    backupDatabase: backupDb,
    sha256: sha256(backupDb),
    bytes: fs.statSync(backupDb).size,
    configCopied,
    counts,
    retention,
  };

  const manifestPath = path.join(dir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });

  pruneOldBackups();

  console.log(`[case002-backup] created ${dir}`);
  console.log(`[case002-backup] sha256=${manifest.sha256}`);
  console.log(`[case002-backup] workflows=${counts.workflow_entity ?? 'n/a'} credentials=${counts.credentials_entity ?? 'n/a'} users=${counts.user ?? 'n/a'}`);
})().catch((err) => {
  console.error(`[case002-backup] FAILED: ${err.stack || err.message}`);
  if (required) process.exit(1);
  process.exit(0);
});
