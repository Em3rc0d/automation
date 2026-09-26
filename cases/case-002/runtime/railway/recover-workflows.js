#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');

const n8nRequire = createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3 = n8nRequire('sqlite3');

const log = (m) => console.log(`[case002-recovery] ${m}`);
const requiredTables = ['workflow_entity', 'shared_workflow', 'project', 'project_relation', 'user', 'role'];
const selectedDbMarker = '/tmp/case002-selected-db-path';

function uniq(values) {
  return [...new Set(values.filter(Boolean).map((v) => path.resolve(v)))];
}

function walkForDatabase(dir, depth = 0, out = []) {
  if (depth > 5 || !fs.existsSync(dir)) return out;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return out;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === 'database.sqlite') out.push(full);
    if (entry.isDirectory() && !['node_modules', 'proc', 'sys', 'dev'].includes(entry.name)) {
      walkForDatabase(full, depth + 1, out);
    }
  }
  return out;
}

function openDb(file, mode = sqlite3.OPEN_READONLY) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, mode, (e) => (e ? reject(e) : resolve(db)));
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (e, rows) => (e ? reject(e) : resolve(rows))));
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (e, row) => (e ? reject(e) : resolve(row))));
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function (e) {
      e ? reject(e) : resolve({ changes: this.changes });
    }),
  );
}

function close(db) {
  return new Promise((resolve) => db.close(() => resolve()));
}

async function inspectCandidate(file) {
  try {
    const db = await openDb(file);
    const rows = await all(db, "SELECT name FROM sqlite_master WHERE type='table'");
    const tables = new Set(rows.map((r) => r.name));
    const valid = requiredTables.every((t) => tables.has(t));

    let workflows = -1;
    let users = -1;
    let credentials = -1;
    let executions = -1;

    if (valid) {
      workflows = Number((await get(db, 'SELECT COUNT(*) AS count FROM workflow_entity'))?.count || 0);
      users = Number((await get(db, 'SELECT COUNT(*) AS count FROM "user"'))?.count || 0);

      if (tables.has('credentials_entity')) {
        credentials = Number((await get(db, 'SELECT COUNT(*) AS count FROM credentials_entity'))?.count || 0);
      }
      if (tables.has('execution_entity')) {
        executions = Number((await get(db, 'SELECT COUNT(*) AS count FROM execution_entity'))?.count || 0);
      }
    }

    await close(db);
    return {
      file,
      valid,
      workflows,
      users,
      credentials,
      executions,
      size: fs.statSync(file).size,
    };
  } catch (e) {
    return {
      file,
      valid: false,
      workflows: -1,
      users: -1,
      credentials: -1,
      executions: -1,
      size: 0,
      error: e?.message || String(e),
    };
  }
}

async function locateDatabase() {
  const home = os.homedir();
  const n8nBase = process.env.N8N_USER_FOLDER || home;
  const configured = process.env.DB_SQLITE_DATABASE;
  const explicit = configured
    ? path.isAbsolute(configured)
      ? configured
      : path.join(n8nBase, '.n8n', configured)
    : null;

  const candidates = uniq([
    explicit,
    path.join(n8nBase, '.n8n', 'database.sqlite'),
    path.join(home, '.n8n', 'database.sqlite'),
    '/home/node/.n8n/database.sqlite',
    '/home/node/.n8n/.n8n/database.sqlite',
    '/root/.n8n/database.sqlite',
    ...walkForDatabase('/home/node'),
    ...walkForDatabase('/root'),
    ...walkForDatabase('/data'),
  ]).filter((p) => fs.existsSync(p));

  log(`database candidates found=${candidates.length}`);
  const inspected = [];

  for (const file of candidates) {
    const info = await inspectCandidate(file);
    inspected.push(info);
    log(
      `candidate: ${file} valid=${info.valid} workflows=${info.workflows} users=${info.users} ` +
        `credentials=${info.credentials} executions=${info.executions} bytes=${info.size}`,
    );
  }

  const valid = inspected.filter((x) => x.valid);
  if (!valid.length) return { selected: null, inspected };

  valid.sort(
    (a, b) =>
      b.workflows - a.workflows ||
      b.executions - a.executions ||
      b.credentials - a.credentials ||
      b.size - a.size,
  );

  return { selected: valid[0], inspected };
}

function copyIfExists(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.copyFileSync(src, dst);
  fs.chmodSync(dst, 0o600);
}

function writeSelectedDbMarker(dbPath) {
  fs.writeFileSync(selectedDbMarker, `${dbPath}\n`, { mode: 0o600 });
  log(`selected DB marker written: ${selectedDbMarker} -> ${dbPath}`);
}

async function main() {
  try {
    fs.unlinkSync(selectedDbMarker);
  } catch (_) {}

  const { selected, inspected } = await locateDatabase();
  if (!selected) {
    log('ABORT: no valid n8n SQLite database found; nothing modified');
    return;
  }

  const dbPath = selected.file;
  const stateDir = path.dirname(dbPath);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(stateDir, 'recovery', `workflow-access-${ts}`);

  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  log(`selected database: ${dbPath} workflows=${selected.workflows}`);

  copyIfExists(dbPath, path.join(backupDir, 'database.sqlite'));
  copyIfExists(`${dbPath}-wal`, path.join(backupDir, 'database.sqlite-wal'));
  copyIfExists(`${dbPath}-shm`, path.join(backupDir, 'database.sqlite-shm'));
  log(`database backup created: ${backupDir}`);

  const discoveryReportPath = path.join(backupDir, 'database-discovery.json');
  fs.writeFileSync(
    discoveryReportPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), selected, inspected }, null, 2),
    { mode: 0o600 },
  );

  // Critical: pin subsequent n8n CLI calls and the main runtime to the same
  // database we just discovered. Previously the repair could modify a populated
  // DB while n8n later opened a different empty DB.
  writeSelectedDbMarker(dbPath);

  try {
    const exportPath = path.join(backupDir, 'workflows.json');
    execFileSync('n8n', ['export:workflow', '--all', '--output', exportPath], {
      env: {
        ...process.env,
        DB_SQLITE_DATABASE: dbPath,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (fs.existsSync(exportPath)) fs.chmodSync(exportPath, 0o600);
    log(`workflow export created: ${exportPath}`);
  } catch (e) {
    log(`workflow export warning: ${e?.message || String(e)}`);
  }

  const db = await openDb(dbPath, sqlite3.OPEN_READWRITE);
  const report = {
    generatedAt: new Date().toISOString(),
    dbPath,
    backupDir,
    selectedCandidate: selected,
    insertedProjectRelations: [],
    insertedWorkflowOwners: [],
    status: 'inspected',
  };

  const writeReport = () =>
    fs.writeFileSync(path.join(backupDir, 'recovery-report.json'), JSON.stringify(report, null, 2), {
      mode: 0o600,
    });

  try {
    await run(db, 'PRAGMA foreign_keys = ON');

    const workflowCount = Number((await get(db, 'SELECT COUNT(*) AS count FROM workflow_entity')).count || 0);
    const sharedCount = Number((await get(db, 'SELECT COUNT(*) AS count FROM shared_workflow')).count || 0);
    const projectCount = Number((await get(db, 'SELECT COUNT(*) AS count FROM project')).count || 0);
    const relationCount = Number((await get(db, 'SELECT COUNT(*) AS count FROM project_relation')).count || 0);
    const users = await all(db, 'SELECT id, "roleSlug" AS roleSlug, disabled FROM "user"');
    const owners = users.filter(
      (u) => u.roleSlug === 'global:owner' && Number(u.disabled || 0) === 0,
    );

    report.preflight = {
      workflowCount,
      sharedCount,
      projectCount,
      relationCount,
      users: users.length,
      owners: owners.length,
    };

    log(
      `preflight: workflows=${workflowCount}, shared=${sharedCount}, projects=${projectCount}, ` +
        `relations=${relationCount}, users=${users.length}, owners=${owners.length}`,
    );

    if (workflowCount === 0) {
      report.status = 'aborted-zero-workflows';
      writeReport();
      log('ABORT: selected database contains zero workflows; refusing to manufacture ownership rows');
      return;
    }

    if (owners.length !== 1) {
      report.status = 'aborted-owner-count';
      writeReport();
      log('ABORT: repair requires exactly one active global owner');
      return;
    }

    const ownerId = owners[0].id;
    const roles = new Set((await all(db, 'SELECT slug FROM role')).map((r) => r.slug));

    if (!roles.has('project:personalOwner')) {
      report.status = 'aborted-missing-role';
      writeReport();
      log('ABORT: project:personalOwner role missing');
      return;
    }

    const ownerRelations = await all(
      db,
      'SELECT "projectId" AS projectId, role FROM project_relation WHERE "userId"=?',
      [ownerId],
    );
    const accessible = new Set(ownerRelations.map((r) => r.projectId));

    let personal = await all(
      db,
      `SELECT p.id, p.name, p.type, p."creatorId" AS creatorId
         FROM project p
         JOIN project_relation pr ON pr."projectId"=p.id
        WHERE pr."userId"=? AND p.type='personal'`,
      [ownerId],
    );

    let target = personal[0] || null;
    let needsTargetRelation = false;

    if (!target) {
      const byCreator = await all(
        db,
        `SELECT id, name, type, "creatorId" AS creatorId
           FROM project
          WHERE type='personal' AND "creatorId"=?`,
        [ownerId],
      );

      if (byCreator.length === 1) {
        target = byCreator[0];
        needsTargetRelation = true;
      } else {
        const allPersonal = await all(
          db,
          `SELECT id, name, type, "creatorId" AS creatorId FROM project WHERE type='personal'`,
        );
        if (allPersonal.length === 1) {
          target = allPersonal[0];
          needsTargetRelation = true;
        }
      }
    }

    if (!target) {
      report.status = 'aborted-no-personal-project';
      writeReport();
      log('ABORT: no unambiguous personal project found for sole owner');
      return;
    }

    const plans = [];

    if (needsTargetRelation && !accessible.has(target.id)) {
      plans.push({
        projectId: target.id,
        role: 'project:personalOwner',
        reason: 'restore-owner-personal-project',
      });
    }

    const workflowProjects = await all(
      db,
      `SELECT DISTINCT sw."projectId" AS projectId, p.type
         FROM shared_workflow sw
         JOIN project p ON p.id=sw."projectId"`,
    );

    for (const p of workflowProjects) {
      if (accessible.has(p.projectId) || plans.some((x) => x.projectId === p.projectId)) continue;

      if (p.type === 'personal') {
        plans.push({
          projectId: p.projectId,
          role: 'project:personalOwner',
          reason: 'restore-workflow-project-access',
        });
      } else if (p.type === 'team' && roles.has('project:admin')) {
        plans.push({
          projectId: p.projectId,
          role: 'project:admin',
          reason: 'restore-team-project-access',
        });
      } else {
        report.status = 'aborted-unsafe-project-role';
        report.unsafeProject = p;
        writeReport();
        log(`ABORT: cannot safely restore project ${p.projectId} (${p.type})`);
        return;
      }
    }

    const withoutOwner = await all(
      db,
      `SELECT w.id, w.name
         FROM workflow_entity w
        WHERE NOT EXISTS (
          SELECT 1
            FROM shared_workflow sw
           WHERE sw."workflowId"=w.id
             AND sw.role='workflow:owner'
        )`,
    );

    await run(db, 'BEGIN IMMEDIATE TRANSACTION');

    try {
      for (const p of plans) {
        const r = await run(
          db,
          `INSERT OR IGNORE INTO project_relation ("projectId","userId",role)
           VALUES (?,?,?)`,
          [p.projectId, ownerId, p.role],
        );
        if (r.changes) report.insertedProjectRelations.push(p);
      }

      for (const w of withoutOwner) {
        const existing = await get(
          db,
          `SELECT role
             FROM shared_workflow
            WHERE "workflowId"=? AND "projectId"=?`,
          [w.id, target.id],
        );

        if (existing) {
          const r = await run(
            db,
            `UPDATE shared_workflow
                SET role='workflow:owner',
                    "updatedAt"=STRFTIME('%Y-%m-%d %H:%M:%f','NOW')
              WHERE "workflowId"=? AND "projectId"=?`,
            [w.id, target.id],
          );
          if (r.changes) {
            report.insertedWorkflowOwners.push({
              workflowId: w.id,
              action: 'promoted-existing-share',
            });
          }
        } else {
          const r = await run(
            db,
            `INSERT INTO shared_workflow ("workflowId","projectId",role)
             VALUES (?,?,'workflow:owner')`,
            [w.id, target.id],
          );
          if (r.changes) {
            report.insertedWorkflowOwners.push({
              workflowId: w.id,
              action: 'inserted-owner-share',
            });
          }
        }
      }

      const visible = Number(
        (
          await get(
            db,
            `SELECT COUNT(DISTINCT w.id) AS count
               FROM workflow_entity w
               JOIN shared_workflow sw ON sw."workflowId"=w.id
               JOIN project_relation pr
                 ON pr."projectId"=sw."projectId"
                AND pr."userId"=?`,
            [ownerId],
          )
        ).count || 0,
      );

      const stillNoOwner = Number(
        (
          await get(
            db,
            `SELECT COUNT(*) AS count
               FROM workflow_entity w
              WHERE NOT EXISTS (
                SELECT 1
                  FROM shared_workflow sw
                 WHERE sw."workflowId"=w.id
                   AND sw.role='workflow:owner'
              )`,
          )
        ).count || 0,
      );

      await run(db, 'COMMIT');

      report.status = 'repaired';
      report.targetPersonalProjectId = target.id;
      report.postflight = {
        accessibleWorkflowCount: visible,
        workflowCount,
        remainingWithoutOwner: stillNoOwner,
      };
      report.accessibleWorkflows = await all(
        db,
        `SELECT DISTINCT w.id, w.name
           FROM workflow_entity w
           JOIN shared_workflow sw ON sw."workflowId"=w.id
           JOIN project_relation pr
             ON pr."projectId"=sw."projectId"
            AND pr."userId"=?
          ORDER BY w.name`,
        [ownerId],
      );

      writeReport();

      log(
        `repair complete: accessible=${visible}/${workflowCount}, remaining_without_owner=${stillNoOwner}`,
      );
      log(
        `project_relations_added=${report.insertedProjectRelations.length}, ` +
          `workflow_owner_shares_added_or_promoted=${report.insertedWorkflowOwners.length}`,
      );
      log(`report: ${path.join(backupDir, 'recovery-report.json')}`);
    } catch (e) {
      try {
        await run(db, 'ROLLBACK');
      } catch (_) {}

      report.status = 'rolled-back-error';
      report.error = e?.message || String(e);
      writeReport();
      log(`ROLLBACK: ${report.error}`);
    }
  } finally {
    await close(db);
  }
}

main().catch((e) => {
  log(`fatal: ${e?.message || String(e)}`);
  process.exitCode = 1;
});
