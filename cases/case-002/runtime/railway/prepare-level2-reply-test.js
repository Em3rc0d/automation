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

function runN8nQuiet(args) {
  execFileSync(N8N, args, {
    env: process.env,
    stdio: ['ignore', 'ignore', 'pipe'],
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

async function verifyKapsoApiCredential(credential) {
  const exported = tempFile('kapso-api-credential');

  try {
    runN8nQuiet([
      'export:credentials',
      `--id=${credential.id}`,
      '--decrypted',
      `--output=${exported}`,
    ]);

    const parsed = JSON.parse(fs.readFileSync(exported, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const found = list.find((item) => item && item.id === credential.id);
    const headerName = String(found?.data?.name || '');
    const headerValue = String(found?.data?.value || '');

    if (headerName.toLowerCase() !== 'x-api-key') {
      fail(`KAPSO API credential header must be X-API-Key, got ${headerName || 'empty'}`);
    }
    if (!headerValue) fail('KAPSO API credential value is empty');

    const response = await fetch('https://api.kapso.ai/platform/v1/functions?limit=1', {
      method: 'GET',
      headers: { 'X-API-Key': headerValue },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      fail(`KAPSO API authentication preflight returned HTTP ${response.status}`);
    }

    console.log(`[case002-level2-reply] KAPSO API auth preflight PASS status=${response.status}`);
  } finally {
    try { fs.unlinkSync(exported); } catch (_) {}
  }
}

async function bindSend() {
  const rows = await queryAll(
    'SELECT id, name, type FROM credentials_entity WHERE name = ? AND type = ? ORDER BY id',
    ['KAPSO API', 'httpHeaderAuth'],
  );
  if (rows.length !== 1) fail(`expected exactly one KAPSO API httpHeaderAuth credential, found ${rows.length}`);

  const credential = rows[0];
  await verifyKapsoApiCredential(credential);

  const exported = tempFile('send-export');
  const patched = tempFile('send-patched');

  try {
    const current = exportWorkflow('kapsoMessageSendV1', exported);
    const node = current.workflow.nodes.find((item) => item.name === 'Send Kapso Message');
    if (!node) fail('Send Kapso Message node missing');

    const existing = credentialBinding(node, 'httpHeaderAuth');
    if (!existing || existing.id !== credential.id) {
      node.credentials = {
        ...(node.credentials || {}),
        httpHeaderAuth: { id: credential.id, name: credential.name },
      };
      importWorkflow(current.parsed, current.list, current.workflow, patched);
    }

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

function buildTestAcknowledgeNode() {
  return {
    parameters: {
      respondWith: 'json',
      responseBody: "={{ { ok: true, test: 'case002-level2-reply' } }}",
      options: {
        responseCode: 200,
      },
    },
    id: 'case002-level2-test-ack',
    name: 'Acknowledge CASE002 Level2 Webhook',
    type: 'n8n-nodes-base.respondToWebhook',
    typeVersion: 1.4,
    position: [1940, 120],
    notes: 'LEVEL-2 TEST ONLY. Acknowledge Kapso before the outbound provider call so a slow or ambiguous send cannot trigger an inbound provider retry.',
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
    position: [2200, 120],
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
    position: [2460, 120],
    notes: 'LEVEL-2 TEST ONLY. Fail closed: any child workflow/provider error must fail the parent execution.',
  };
}

function verifySendNode() {
  return {
    parameters: {
      jsCode: "const result = $input.first().json || {};\nif (result.status !== 'accepted_by_provider') throw new Error('CASE002_LEVEL2_SEND_NOT_ACCEPTED');\nif (!result.providerMessageId) throw new Error('CASE002_LEVEL2_PROVIDER_MESSAGE_ID_MISSING');\nreturn [{ json: { ok: true, status: result.status, providerMessageId: String(result.providerMessageId), businessActionId: String(result.businessActionId || '') } }];",
    },
    id: 'case002-level2-verify-send',
    name: 'Verify CASE002 Level2 Send',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [2720, 120],
    notes: 'LEVEL-2 TEST ONLY. A green parent execution is allowed only after Kapso returns a provider message id.',
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
    const testAckId = 'case002-level2-test-ack';
    const buildId = 'case002-level2-build-reply';
    const sendId = 'case002-level2-execute-send';
    const verifyId = 'case002-level2-verify-send';
    const overlayIds = [gateId, testAckId, buildId, sendId, verifyId];

    workflow.nodes = workflow.nodes.filter((item) => !overlayIds.includes(item.id));
    workflow.nodes.push(
      buildReplyGateNode(),
      buildTestAcknowledgeNode(),
      buildReplyNode(),
      executeSendNode(),
      verifySendNode(),
    );

    workflow.connections = workflow.connections || {};
    workflow.connections['Post Normalized Message'] = {
      main: [[{ node: 'CASE002 Level2 Reply Gate', type: 'main', index: 0 }]],
    };
    workflow.connections['CASE002 Level2 Reply Gate'] = {
      main: [
        [{ node: 'Acknowledge CASE002 Level2 Webhook', type: 'main', index: 0 }],
        [{ node: 'Acknowledge Kapso Webhook', type: 'main', index: 0 }],
      ],
    };
    workflow.connections['Acknowledge CASE002 Level2 Webhook'] = {
      main: [[{ node: 'Build CASE002 Level2 Reply', type: 'main', index: 0 }]],
    };
    workflow.connections['Build CASE002 Level2 Reply'] = {
      main: [[{ node: 'Send CASE002 Level2 Reply', type: 'main', index: 0 }]],
    };
    workflow.connections['Send CASE002 Level2 Reply'] = {
      main: [[{ node: 'Verify CASE002 Level2 Send', type: 'main', index: 0 }]],
    };
    delete workflow.connections['Verify CASE002 Level2 Send'];

    ack.position = [1940, 340];

    importWorkflow(current.parsed, current.list, workflow, patched);

    const verify = exportWorkflow('kapsoMessageReceiveV1', exported);
    const ids = new Set(verify.workflow.nodes.map((item) => item.id));
    const verifyHmac = verify.workflow.nodes.find((item) => item.name === 'Calculate Kapso HMAC');
    const verifyPost = verify.workflow.nodes.find((item) => item.name === 'Post Normalized Message');
    const verifySend = verify.workflow.nodes.find((item) => item.id === sendId);
    const postTargets = verify.workflow.connections?.['Post Normalized Message']?.main?.[0] || [];
    const ackTargets = verify.workflow.connections?.['Acknowledge CASE002 Level2 Webhook']?.main?.[0] || [];
    const sendTargets = verify.workflow.connections?.['Send CASE002 Level2 Reply']?.main?.[0] || [];

    if (!overlayIds.every((id) => ids.has(id))) fail('receive overlay node verification failed');
    if (!credentialBinding(verifyHmac, 'crypto')) fail('Receive HMAC binding lost during overlay');
    if (!credentialBinding(verifyPost, 'httpHeaderAuth')) fail('Receive control-plane binding lost during overlay');
    if (verifySend?.onError) fail('Send CASE002 Level2 Reply must fail closed');
    if (!postTargets.some((edge) => edge.node === 'CASE002 Level2 Reply Gate')) fail('receive overlay gate connection verification failed');
    if (!ackTargets.some((edge) => edge.node === 'Build CASE002 Level2 Reply')) fail('receive overlay post-ack connection verification failed');
    if (!sendTargets.some((edge) => edge.node === 'Verify CASE002 Level2 Send')) fail('receive overlay send verification connection failed');

    console.log('[case002-level2-reply] receive overlay PASS fail-closed=true');
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
