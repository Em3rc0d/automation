#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');

const n8nRequire = createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3 = n8nRequire('sqlite3');
const userFolder = process.env.N8N_USER_FOLDER || '/home/node/.n8n';
const configuredDb = process.env.DB_SQLITE_DATABASE;
const dbPath = configuredDb
  ? (path.isAbsolute(configuredDb) ? configuredDb : path.join(userFolder, configuredDb))
  : path.join(userFolder, 'database.sqlite');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(userFolder, 'recovery', `workflow-access-${ts}`);
fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });

const log = (m) => console.log(`[case002-recovery] ${m}`);
function copyIfExists(src, name) {
  if (!fs.existsSync(src)) return;
  const dst = path.join(backupDir, name);
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, 0o600);
  log(`backup created: ${dst}`);
}

if (!fs.existsSync(dbPath)) {
  log(`ABORT: SQLite database not found at ${dbPath}`);
  process.exit(0);
}

copyIfExists(dbPath, 'database.sqlite');
copyIfExists(`${dbPath}-wal`, 'database.sqlite-wal');
copyIfExists(`${dbPath}-shm`, 'database.sqlite-shm');

try {
  const exportPath = path.join(backupDir, 'workflows.json');
  execFileSync('n8n', ['export:workflow', '--all', '--output', exportPath], {
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (fs.existsSync(exportPath)) fs.chmodSync(exportPath, 0o600);
  log(`workflow export created: ${exportPath}`);
} catch (e) {
  log(`workflow export warning: ${e?.message || String(e)}`);
}

const db = new sqlite3.Database(dbPath);
const all = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (e, rows) => e ? reject(e) : resolve(rows)));
const get = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (e, row) => e ? reject(e) : resolve(row)));
const run = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (e) { e ? reject(e) : resolve({ changes: this.changes }); }));
const close = () => new Promise((resolve) => db.close(() => resolve()));

async function main() {
  await run('PRAGMA foreign_keys = ON');
  const tableRows = await all("SELECT name FROM sqlite_master WHERE type='table'");
  const tables = new Set(tableRows.map((r) => r.name));
  const required = ['workflow_entity', 'shared_workflow', 'project', 'project_relation', 'user', 'role'];
  const missing = required.filter((t) => !tables.has(t));
  if (missing.length) return log(`ABORT: required tables missing: ${missing.join(', ')}`);

  const workflowCount = (await get('SELECT COUNT(*) AS count FROM workflow_entity')).count;
  const sharedCount = (await get('SELECT COUNT(*) AS count FROM shared_workflow')).count;
  const projectCount = (await get('SELECT COUNT(*) AS count FROM project')).count;
  const relationCount = (await get('SELECT COUNT(*) AS count FROM project_relation')).count;
  const users = await all('SELECT id, "roleSlug" AS roleSlug, disabled FROM "user"');
  const owners = users.filter((u) => u.roleSlug === 'global:owner' && Number(u.disabled || 0) === 0);
  log(`preflight: workflows=${workflowCount}, shared=${sharedCount}, projects=${projectCount}, relations=${relationCount}, users=${users.length}, owners=${owners.length}`);

  const report = { generatedAt: new Date().toISOString(), dbPath, backupDir, preflight: { workflowCount, sharedCount, projectCount, relationCount, users: users.length, owners: owners.length }, insertedProjectRelations: [], insertedWorkflowOwners: [], status: 'inspected' };
  const writeReport = () => fs.writeFileSync(path.join(backupDir, 'recovery-report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });

  if (owners.length !== 1) {
    report.status = 'aborted-owner-count'; writeReport();
    return log('ABORT: repair requires exactly one active global owner.');
  }
  const ownerId = owners[0].id;
  const roles = new Set((await all('SELECT slug FROM role')).map((r) => r.slug));
  if (!roles.has('project:personalOwner')) {
    report.status = 'aborted-missing-role'; writeReport();
    return log('ABORT: project:personalOwner role missing.');
  }

  let personal = await all(`SELECT p.id, p.name, p.type, p."creatorId" AS creatorId FROM project p JOIN project_relation pr ON pr."projectId"=p.id WHERE pr."userId"=? AND p.type='personal'`, [ownerId]);
  let target = personal[0] || null;
  let needsTargetRelation = false;
  if (!target) {
    const byCreator = await all(`SELECT id, name, type, "creatorId" AS creatorId FROM project WHERE type='personal' AND "creatorId"=?`, [ownerId]);
    if (byCreator.length === 1) { target = byCreator[0]; needsTargetRelation = true; }
    else {
      const allPersonal = await all(`SELECT id, name, type, "creatorId" AS creatorId FROM project WHERE type='personal'`);
      if (allPersonal.length === 1) { target = allPersonal[0]; needsTargetRelation = true; }
    }
  }
  if (!target) {
    report.status = 'aborted-no-personal-project'; writeReport();
    return log('ABORT: no unambiguous personal project found for sole owner.');
  }

  const existingRelations = await all(`SELECT "projectId" AS projectId, role FROM project_relation WHERE "userId"=?`, [ownerId]);
  const accessible = new Set(existingRelations.map((r) => r.projectId));
  const plans = [];
  if (needsTargetRelation && !accessible.has(target.id)) plans.push({ projectId: target.id, role: 'project:personalOwner', reason: 'restore-owner-personal-project' });

  const ownerProjects = await all(`SELECT DISTINCT sw."projectId" AS projectId, p.type FROM shared_workflow sw JOIN project p ON p.id=sw."projectId" WHERE sw.role='workflow:owner'`);
  for (const p of ownerProjects) {
    if (accessible.has(p.projectId) || plans.some((x) => x.projectId === p.projectId)) continue;
    if (p.type === 'personal') plans.push({ projectId: p.projectId, role: 'project:personalOwner', reason: 'restore-workflow-project-access' });
    else if (p.type === 'team' && roles.has('project:admin')) plans.push({ projectId: p.projectId, role: 'project:admin', reason: 'restore-team-project-access' });
    else {
      report.status = 'aborted-unsafe-project-role'; report.unsafeProject = p; writeReport();
      return log(`ABORT: cannot safely restore project ${p.projectId} (${p.type}).`);
    }
  }

  const withoutOwner = await all(`SELECT w.id, w.name FROM workflow_entity w WHERE NOT EXISTS (SELECT 1 FROM shared_workflow sw WHERE sw."workflowId"=w.id AND sw.role='workflow:owner')`);

  await run('BEGIN IMMEDIATE TRANSACTION');
  try {
    for (const p of plans) {
      const r = await run(`INSERT OR IGNORE INTO project_relation ("projectId","userId",role) VALUES (?,?,?)`, [p.projectId, ownerId, p.role]);
      if (r.changes) report.insertedProjectRelations.push(p);
    }
    for (const w of withoutOwner) {
      const existing = await get(`SELECT role FROM shared_workflow WHERE "workflowId"=? AND "projectId"=?`, [w.id, target.id]);
      if (existing) {
        const r = await run(`UPDATE shared_workflow SET role='workflow:owner', "updatedAt"=STRFTIME('%Y-%m-%d %H:%M:%f','NOW') WHERE "workflowId"=? AND "projectId"=?`, [w.id, target.id]);
        if (r.changes) report.insertedWorkflowOwners.push({ workflowId: w.id, action: 'promoted-existing-share' });
      } else {
        const r = await run(`INSERT INTO shared_workflow ("workflowId","projectId",role) VALUES (?,?,'workflow:owner')`, [w.id, target.id]);
        if (r.changes) report.insertedWorkflowOwners.push({ workflowId: w.id, action: 'inserted-owner-share' });
      }
    }

    const visible = (await get(`SELECT COUNT(DISTINCT w.id) AS count FROM workflow_entity w JOIN shared_workflow sw ON sw."workflowId"=w.id JOIN project_relation pr ON pr."projectId"=sw."projectId" AND pr."userId"=?`, [ownerId])).count;
    const stillNoOwner = (await get(`SELECT COUNT(*) AS count FROM workflow_entity w WHERE NOT EXISTS (SELECT 1 FROM shared_workflow sw WHERE sw."workflowId"=w.id AND sw.role='workflow:owner')`)).count;
    await run('COMMIT');

    report.status = 'repaired';
    report.targetPersonalProjectId = target.id;
    report.postflight = { accessibleWorkflowCount: visible, workflowCount, remainingWithoutOwner: stillNoOwner };
    report.accessibleWorkflows = await all(`SELECT DISTINCT w.id, w.name FROM workflow_entity w JOIN shared_workflow sw ON sw."workflowId"=w.id JOIN project_relation pr ON pr."projectId"=sw."projectId" AND pr."userId"=? ORDER BY w.name`, [ownerId]);
    writeReport();
    log(`repair complete: accessible=${visible}/${workflowCount}, remaining_without_owner=${stillNoOwner}`);
    log(`project_relations_added=${report.insertedProjectRelations.length}, workflow_owner_shares_added_or_promoted=${report.insertedWorkflowOwners.length}`);
    log(`report: ${path.join(backupDir, 'recovery-report.json')}`);
  } catch (e) {
    try { await run('ROLLBACK'); } catch (_) {}
    report.status = 'rolled-back-error'; report.error = e?.message || String(e); writeReport();
    log(`ROLLBACK: ${report.error}`);
  }
}

main().catch((e) => log(`fatal: ${e?.message || String(e)}`)).finally(close);
