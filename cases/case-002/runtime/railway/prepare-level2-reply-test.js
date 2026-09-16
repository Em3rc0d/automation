#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');

const requireFromN8n = createRequire('/usr/local/lib/node_modules/n8n/package.json');
const sqlite3 = requireFromN8n('sqlite3');

const N8N = '/usr/local/lib/node_modules/n8n/bin/n8n';
const DB = process.env.DB_SQLITE_DATABASE || '/home/node/.n8n/database.sqlite';
const mode = process.argv[2] || '';

function fail(message) {
  console.error(`[case002-level2-reply] FAIL ${message}`);
  process.exit(1);
}

function runN8n(args) {
  execFileSync(N8N, args, {
    env: process.env,
    stdio: 'inherit',
  });
}

function tempFile(name) {
  return path.join(os.tmpdir(), `case002-${process.pid}-${name}.json`);
}

function readWorkflowFile(file, expectedId) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(parsed) ? parsed : [parsed];
  const workflow = list.find((item) => item && item.id === expectedId);
  if (!workflow) fail(`workflow ${expectedId} not found in export`);
  return { parsed, list, workflow };
}

function exportWorkflow(id, file) {
  runN8n(['export:workflow', `--id=${id}`, `--output=${file}`]);
  return readWorkflowFile(file, id);
}

function importWorkflow(parsedShape, list, workflow, file) {
  const output = Array.isArray(parsedShape) ? list : workflow;
  fs.writeFileSync(file, JSON.stringify(output), { mode: 0o600 });
  runN8n(['import:workflow', `--input=${file}`]);
}

function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB, sqlite3.OPEN_READONLY, (openError) => {
      if (openError) return reject(openError);
      db.all(sql, params, (error, rows) => {
        db.close();
        if (error) return reject(error);
        resolve(rows || []);
      });
    });
  });
}

function credentialBinding(node, type) {
  return node && node.credentials && node.credentials[type];
}

async function bindSend() {
  const rows = await queryAll(
    "SELECT id, name, type FROM credentials_entity WHERE name = ? AND type = ? ORDER BY id",
    ['KAPSO API', 'httpHeaderAuth'],
  );
  if (rows.length !== 1) fail(`expected exactly one KAPSO API httpHeaderAuth credential, found ${rows.length}`);

  const credential = rows[0];
  const exported = tempFile('send-export');
  const patched = tempFile('send-patched');

  try {
    const current = exportWorkflow('kapsoMessageSendV1', exported);
    const node = current.workflow.nodes.find((item) => item.name === 'Send Kapso Message');
    if (!node) fail('Send Kapso Message node missing');

    const existing = credentialBinding(node, 'httpHeaderAuth');
    if (existing && existing.id === credential.id) {
      console.log(`[case002-level2-reply] send binding already present id=${credential.id} name=${credential.name}`);
      return;
    }

    node.credentials = {
      ...(node.credentials || {}),
      httpHeaderAuth: { id: credential.id, name: credential.name },
    };

    importWorkflow(current.parsed, current.list, current.workflow, patched);

    const verify = exportWorkflow('kapsoMessageSendV1', exported);
    const verifyNode = verify.workflow.nodes.find((item) => item.name === 'Send Kapso Message');
    const binding = credentialBinding(verifyNode, 'httpHeaderAuth');
    if (!binding || binding.id !== credential.id) fail('send credential binding verification failed');

    console.log(`[case002-level2-reply] send binding PASS id=${credential.id} name=${credential.name}`);
  } finally {
    for (const file of [exported, patched]) {
      try { fs.unlinkSync(file); } catch (_) {}
    }
  }
}

function buildReplyGateNode() {
  return {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: 'case002-level2-reply-condition',
            leftValue: "={{ String($('Normalize Kapso Message').first().json.text || '').trim().startsWith('PRUEBA CASE002') }}",
            rightValue: true,
            operator: {
              type: 'boolean',
              operation: 'true',
              singleValue: true,
            },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    id: 'case002-level2-reply-gate',
    name: 'CASE002 Level2 Reply Gate',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [1680, 220],
    notes: 'LEVEL-2 TEST ONLY. Replies only to messages whose normalized text starts with PRUEBA CASE002.',
  };
}

function buildReplyNode() {
  return {
    parameters: {
      jsCode: "const m = $('Normalize Kapso Message').first().json;\nif (!m.providerPhoneNumberId || !m.senderId || !m.providerMessageId) throw new Error('CASE002_LEVEL2_REPLY_INPUT_MISSING');\nconst providerMessageId = String(m.providerMessageId);\nconst providerPhoneNumberId = String(m.providerPhoneNumberId);\nreturn [{ json: {\n  tenantId: 'case002-level2-test',\n  providerPhoneNumberId,\n  to: String(m.senderId),\n  text: 'CASE002 recibido correctamente. La prueba de respuesta por WhatsApp esta activa.',\n  traceId: String(m.providerEventId || providerMessageId),\n  businessActionId: `case002-level2-reply:${providerMessageId}`,\n  idempotencyKey: `case002-level2-reply:${providerPhoneNumberId}:${providerMessageId}`\n} }];",
    },
    id: 'case002-level2-build-reply',
    name: 'Build CASE002 Level2 Reply',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1940, 140],
    notes: 'LEVEL-2 TEST ONLY. Produces a deterministic BusinessAction-like request for the hardened Kapso send adapter.',
  };
}

function executeSendNode() {
  return {
    parameters: {
      source: 'database',
      workflowId: {
        __rl: true,
        value: 'kapsoMessageSendV1',
        mode: 'id',
      },
      mode: 'once',
      options: {
        waitForSubWorkflow: true,
      },
    },
    id: 'case002-level2-execute-send',
    name: 'Send CASE002 Level2 Reply',
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.3,
    position: [2200, 140],
    onError: 'continueRegularOutput',
    notes: 'LEVEL-2 TEST ONLY. Calls KAPSO_MESSAGE_SEND@1.0 as a separate adapter. Errors continue so the inbound provider webhook can still be acknowledged without encouraging a blind inbound replay.',
  };
}

async function overlayReceive() {
  const exported = tempFile('receive-export');
  const patched = tempFile('receive-patched');

  try {
    const current = exportWorkflow('kapsoMessageReceiveV1', exported);
    const workflow = current.workflow;
    const hmac = workflow.nodes.find((item) => item.name === 'Calculate Kapso HMAC');
    const post = workflow.nodes.find((item) => item.name === 'Post Normalized Message');
    const ack = workflow.nodes.find((item) => item.name === 'Acknowledge Kapso Webhook');

    if (!credentialBinding(hmac, 'crypto')) fail('Receive HMAC binding missing');
    if (!credentialBinding(post, 'httpHeaderAuth')) fail('Receive control-plane binding missing');
    if (!ack) fail('Acknowledge Kapso Webhook node missing');

    const gateId = 'case002-level2-reply-gate';
    const buildId = 'case002-level2-build-reply';
    const sendId = 'case002-level2-execute-send';
    const existingIds = new Set(workflow.nodes.map((item) => item.id));
    const postTargets = workflow.connections?.['Post Normalized Message']?.main?.[0] || [];
    const alreadyPrepared = existingIds.has(gateId) && existingIds.has(buildId) && existingIds.has(sendId) &&
      postTargets.some((edge) => edge.node === 'CASE002 Level2 Reply Gate');

    if (alreadyPrepared) {
      console.log('[case002-level2-reply] receive overlay already present');
      return;
    }

    workflow.nodes = workflow.nodes.filter((item) => ![gateId, buildId, sendId].includes(item.id));
    workflow.nodes.push(buildReplyGateNode(), buildReplyNode(), executeSendNode());

    workflow.connections = workflow.connections || {};
    workflow.connections['Post Normalized Message'] = {
      main: [[{ node: 'CASE002 Level2 Reply Gate', type: 'main', index: 0 }]],
    };
    workflow.connections['CASE002 Level2 Reply Gate'] = {
      main: [
        [{ node: 'Build CASE002 Level2 Reply', type: 'main', index: 0 }],
        [{ node: 'Acknowledge Kapso Webhook', type: 'main', index: 0 }],
      ],
    };
    workflow.connections['Build CASE002 Level2 Reply'] = {
      main: [[{ node: 'Send CASE002 Level2 Reply', type: 'main', index: 0 }]],
    };
    workflow.connections['Send CASE002 Level2 Reply'] = {
      main: [[{ node: 'Acknowledge Kapso Webhook', type: 'main', index: 0 }]],
    };

    ack.position = [2460, 220];

    importWorkflow(current.parsed, current.list, workflow, patched);

    const verify = exportWorkflow('kapsoMessageReceiveV1', exported);
    const ids = new Set(verify.workflow.nodes.map((item) => item.id));
    const verifyHmac = verify.workflow.nodes.find((item) => item.name === 'Calculate Kapso HMAC');
    const verifyPost = verify.workflow.nodes.find((item) => item.name === 'Post Normalized Message');
    const verifyTargets = verify.workflow.connections?.['Post Normalized Message']?.main?.[0] || [];

    if (![gateId, buildId, sendId].every((id) => ids.has(id))) fail('receive overlay node verification failed');
    if (!credentialBinding(verifyHmac, 'crypto')) fail('Receive HMAC binding lost during overlay');
    if (!credentialBinding(verifyPost, 'httpHeaderAuth')) fail('Receive control-plane binding lost during overlay');
    if (!verifyTargets.some((edge) => edge.node === 'CASE002 Level2 Reply Gate')) fail('receive overlay connection verification failed');

    console.log('[case002-level2-reply] receive overlay PASS');
  } finally {
    for (const file of [exported, patched]) {
      try { fs.unlinkSync(file); } catch (_) {}
    }
  }
}

(async () => {
  if (mode === 'bind-send') return bindSend();
  if (mode === 'overlay-receive') return overlayReceive();
  fail('usage: prepare-level2-reply-test.js <bind-send|overlay-receive>');
})().catch((error) => fail(error && error.message ? error.message : String(error)));
